"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TaskReviewOutcome } from "@/types";

export interface CheckinPayload {
  weekStart: string;
  completedSummary: string;
  incompleteSummary: string;
  blockersSummary: string;
  nextWeekFocus: string;
  isSubmitted?: boolean;
}

export interface RolloverPayload {
  taskId: string;
  sourceWeek: string;
  targetWeek: string;
  note?: string;
  newOwnerId?: string;
  newGoalId?: string;
  dueDate?: string;
}

export interface SimpleReviewPayload {
  taskId: string;
  weekStart: string;
  outcome: "CANCEL" | "KEEP_IN_WEEK";
  note?: string;
}

/**
 * Saves or updates a user's weekly check-in (Draft or Submission).
 */
export async function saveWeeklyCheckinAction(
  payload: CheckinPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: "Database client is not available." };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "You must be signed in to submit a check-in." };
    }

    if (!payload.weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(payload.weekStart)) {
      return { success: false, error: "Invalid week start date format." };
    }

    const completed = payload.completedSummary?.trim() || "";
    const incomplete = payload.incompleteSummary?.trim() || "";
    const blockers = payload.blockersSummary?.trim() || "";
    const nextFocus = payload.nextWeekFocus?.trim() || "";

    const isSubmitted = payload.isSubmitted !== false;

    // Validate max lengths (max 2500 chars each)
    if (
      completed.length > 2500 ||
      incomplete.length > 2500 ||
      blockers.length > 2500 ||
      nextFocus.length > 2500
    ) {
      return { success: false, error: "Check-in responses cannot exceed 2500 characters." };
    }

    // If submitting, ensure at least one field is filled
    if (isSubmitted && !completed && !incomplete && !blockers && !nextFocus) {
      return { success: false, error: "Please provide at least one response before submitting your check-in." };
    }

    const checkinData = {
      user_id: user.id,
      week_start: payload.weekStart,
      completed_summary: completed || null,
      incomplete_summary: incomplete || null,
      blockers_summary: blockers || null,
      next_week_focus: nextFocus || null,
      is_submitted: isSubmitted,
      submitted_at: isSubmitted ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("weekly_checkins")
      .upsert(checkinData, { onConflict: "user_id, week_start" });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/weekly-review");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}

/**
 * Records a non-rollover review outcome (CANCEL or KEEP_IN_WEEK).
 */
export async function recordTaskReviewAction(
  payload: SimpleReviewPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: "Database client is not available." };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "You must be signed in to review tasks." };
    }

    // Verify task exists and caller has permission
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, owner_id, status, week_start")
      .eq("id", payload.taskId)
      .single();

    if (taskError || !task) {
      return { success: false, error: "Task not found." };
    }

    if (task.week_start !== payload.weekStart) {
      return { success: false, error: "Review week must match task week." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "ADMIN";

    if (!isAdmin && task.owner_id !== user.id) {
      return { success: false, error: "You can only review tasks you own." };
    }

    const reviewData = {
      task_id: payload.taskId,
      week_start: task.week_start,
      outcome: payload.outcome as TaskReviewOutcome,
      note: payload.note?.trim() || null,
      reviewed_by: user.id,
      created_at: new Date().toISOString(),
    };

    const { error: reviewError } = await supabase
      .from("task_weekly_reviews")
      .insert(reviewData);

    if (reviewError) {
      if (reviewError.code === "23505" || reviewError.message.includes("task_weekly_reviews_task_week_uniq")) {
        return { success: false, error: "This task has already been reviewed for this week." };
      }
      return { success: false, error: reviewError.message };
    }

    revalidatePath("/weekly-review");
    revalidatePath("/my-tasks");
    revalidatePath("/team-board");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}

/**
 * Executes an atomic task rollover to carry a task into a future week.
 */
export async function rolloverTaskAction(
  payload: RolloverPayload
): Promise<{ success: boolean; newTaskId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: "Database client is not available." };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "You must be signed in to roll over tasks." };
    }

    // Attempt RPC call
    const { data: newTaskId, error: rpcError } = await supabase.rpc("rollover_task", {
      p_task_id: payload.taskId,
      p_target_week: payload.targetWeek,
      p_note: payload.note?.trim() || null,
      p_new_owner_id: payload.newOwnerId || null,
      p_new_goal_id: payload.newGoalId || null,
      p_due_date: payload.dueDate || null,
    });

    if (rpcError) {
      if (rpcError.code === "23505" || rpcError.message.includes("task_weekly_reviews_task_week_uniq")) {
        return { success: false, error: "This task has already been reviewed for this week." };
      }
      return { success: false, error: rpcError.message };
    }

    revalidatePath("/weekly-review");
    revalidatePath("/my-tasks");
    revalidatePath("/team-board");
    revalidatePath("/dashboard");
    revalidatePath("/goals");

    return { success: true, newTaskId: newTaskId as string };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}
