"use server";

import { revalidatePath } from "next/cache";
import { requireActiveAdmin } from "@/lib/auth/guards";
import { GoalStatus } from "@/types";

export interface GoalActionResult {
  success?: boolean;
  error?: string;
  goalId?: string;
}

export interface GoalFormPayload {
  title: string;
  description?: string | null;
  week_start: string;
  status: GoalStatus;
  owner_id?: string | null;
  target_date?: string | null;
}

/**
 * Server action to create a new weekly company goal (ADMIN only)
 */
export async function createGoalAction(
  payload: GoalFormPayload
): Promise<GoalActionResult> {
  const authResult = await requireActiveAdmin();
  if (authResult.error || !authResult.data) {
    return { error: authResult.error || "Permission denied: Administrator role required." };
  }

  const { supabase, user } = authResult.data;

  // Validate Title
  const title = (payload.title || "").trim();
  if (!title) {
    return { error: "Goal title is required." };
  }
  if (title.length > 255) {
    return { error: "Goal title must be under 255 characters." };
  }

  // Validate Week Start
  const weekStart = (payload.week_start || "").trim();
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return { error: "Valid week start date (YYYY-MM-DD) is required." };
  }

  // Validate Target Date if provided (must fall within Monday–Sunday of the goal week)
  const targetDate = payload.target_date ? payload.target_date.trim() : null;
  if (targetDate) {
    const monday = new Date(weekStart + "T00:00:00");
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const target = new Date(targetDate + "T00:00:00");
    if (target < monday || target > sunday) {
      return {
        error: `Target date (${targetDate}) must fall within the execution week (${weekStart} to ${sunday.toISOString().split("T")[0]}).`,
      };
    }
  }

  const { data, error } = await supabase
    .from("weekly_goals")
    .insert({
      title,
      description: payload.description ? payload.description.trim() : null,
      week_start: weekStart,
      status: payload.status || "ON_TRACK",
      created_by: user.id,
      owner_id: payload.owner_id || null,
      target_date: targetDate || null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message || "Failed to create weekly goal." };
  }

  revalidatePath("/weekly-review");
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  revalidatePath("/my-tasks");
  revalidatePath("/team-board");

  return { success: true, goalId: data?.id };
}

/**
 * Server action to update an existing weekly goal (ADMIN only)
 */
export async function updateGoalAction(
  goalId: string,
  payload: GoalFormPayload
): Promise<GoalActionResult> {
  const authResult = await requireActiveAdmin();
  if (authResult.error || !authResult.data) {
    return { error: authResult.error || "Permission denied: Administrator role required." };
  }

  const { supabase } = authResult.data;

  if (!goalId) {
    return { error: "Goal ID is required for update." };
  }

  // Validate Title
  const title = (payload.title || "").trim();
  if (!title) {
    return { error: "Goal title cannot be empty." };
  }

  // Validate Target Date if provided
  const targetDate = payload.target_date ? payload.target_date.trim() : null;
  if (targetDate) {
    const monday = new Date(payload.week_start + "T00:00:00");
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const target = new Date(targetDate + "T00:00:00");
    if (target < monday || target > sunday) {
      return {
        error: `Target date must fall within the execution week (${payload.week_start} to ${sunday.toISOString().split("T")[0]}).`,
      };
    }
  }

  // Check week change consistency: if changing week, ensure no linked tasks exist
  const { data: existingGoal } = await supabase
    .from("weekly_goals")
    .select("week_start")
    .eq("id", goalId)
    .single();

  if (existingGoal && existingGoal.week_start !== payload.week_start) {
    const { data: linkedTasks } = await supabase
      .from("tasks")
      .select("id")
      .eq("goal_id", goalId)
      .limit(1);

    if (linkedTasks && linkedTasks.length > 0) {
      return {
        error: "Cannot change goal week while linked tasks exist. Please unlink or reassign tasks first.",
      };
    }
  }

  const { error } = await supabase
    .from("weekly_goals")
    .update({
      title,
      description: payload.description ? payload.description.trim() : null,
      week_start: payload.week_start,
      status: payload.status,
      owner_id: payload.owner_id || null,
      target_date: targetDate || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", goalId);

  if (error) {
    return { error: error.message || "Failed to update weekly goal." };
  }

  revalidatePath("/weekly-review");
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  revalidatePath("/my-tasks");
  revalidatePath("/team-board");

  return { success: true };
}

/**
 * Server action to delete a weekly goal (ADMIN only)
 */
export async function deleteGoalAction(goalId: string): Promise<GoalActionResult> {
  const authResult = await requireActiveAdmin();
  if (authResult.error || !authResult.data) {
    return { error: authResult.error || "Permission denied: Administrator role required." };
  }

  const { supabase } = authResult.data;

  if (!goalId) {
    return { error: "Goal ID is required." };
  }

  const { error } = await supabase
    .from("weekly_goals")
    .delete()
    .eq("id", goalId);

  if (error) {
    return { error: error.message || "Failed to delete weekly goal." };
  }

  revalidatePath("/weekly-review");
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  revalidatePath("/my-tasks");
  revalidatePath("/team-board");

  return { success: true };
}
