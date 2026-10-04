"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();

  if (!supabase) {
    return { error: "Supabase client is not available. Check environment variables." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be authenticated to create a weekly goal." };
  }

  // Check Admin Role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADMIN") {
    return { error: "Unauthorized: Only workspace administrators can create company goals." };
  }

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
  const supabase = await createClient();

  if (!supabase) {
    return { error: "Supabase client is not available." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be authenticated to update a weekly goal." };
  }

  if (!goalId) {
    return { error: "Goal ID is required for update." };
  }

  // Check Admin Role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADMIN") {
    return { error: "Unauthorized: Only workspace administrators can edit company goals." };
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
 * Linked tasks are unlinked (goal_id set to null) automatically via database ON DELETE SET NULL.
 */
export async function deleteGoalAction(goalId: string): Promise<GoalActionResult> {
  const supabase = await createClient();

  if (!supabase) {
    return { error: "Supabase client is not available." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be authenticated to delete a goal." };
  }

  if (!goalId) {
    return { error: "Goal ID is required." };
  }

  // Check Admin Role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADMIN") {
    return { error: "Unauthorized: Only workspace administrators can delete company goals." };
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
