"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TaskPriority, TaskStatus } from "@/types";

export interface TaskActionResult {
  success?: boolean;
  error?: string;
  taskId?: string;
}

export interface TaskFormPayload {
  title: string;
  description?: string;
  owner_id?: string;
  support_person_id?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  due_date?: string | null;
  week_start: string;
  is_blocked?: boolean;
  blocker_reason?: string | null;
  acceptance_criteria?: string | null;
  goal_id?: string | null;
}

/**
 * Server action to create a new task
 */
export async function createTaskAction(
  payload: TaskFormPayload
): Promise<TaskActionResult> {
  const supabase = await createClient();

  if (!supabase) {
    return { error: "Supabase client is not available. Please check environment variables." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be authenticated to create a task." };
  }

  // Validate Title
  const title = (payload.title || "").trim();
  if (!title) {
    return { error: "Task title is required." };
  }
  if (title.length > 255) {
    return { error: "Task title must be under 255 characters." };
  }

  // Validate Week Start
  const weekStart = (payload.week_start || "").trim();
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return { error: "Valid week start date (YYYY-MM-DD) is required." };
  }

  // Validate User Role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "ADMIN";

  // Ownership: Members must own their tasks; Admins may assign to others
  const ownerId = isAdmin && payload.owner_id ? payload.owner_id : user.id;

  // Validate Blocker
  const isBlocked = payload.is_blocked || payload.status === "BLOCKED";
  const blockerReason = (payload.blocker_reason || "").trim();
  if (isBlocked && !blockerReason) {
    return { error: "A blocker reason is required when a task is marked as blocked." };
  }

  // Validate Progress
  let progress = Math.min(Math.max(Number(payload.progress) || 0, 0), 100);
  if (payload.status === "DONE") {
    progress = 100;
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title,
      description: payload.description ? payload.description.trim() : null,
      owner_id: ownerId,
      created_by: user.id,
      support_person_id: payload.support_person_id || null,
      priority: payload.priority || "MEDIUM",
      status: payload.status || "NOT_STARTED",
      progress,
      due_date: payload.due_date || null,
      week_start: weekStart,
      is_blocked: isBlocked,
      blocker_reason: isBlocked ? blockerReason : null,
      acceptance_criteria: payload.acceptance_criteria ? payload.acceptance_criteria.trim() : null,
      goal_id: payload.goal_id || null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message || "Failed to create task in database." };
  }

  revalidatePath("/weekly-review");
  revalidatePath("/goals");
  revalidatePath("/team-board");
  revalidatePath("/my-tasks");
  revalidatePath("/dashboard");
  return { success: true, taskId: data?.id };
}

/**
 * Server action to update an existing task
 */
export async function updateTaskAction(
  taskId: string,
  payload: TaskFormPayload
): Promise<TaskActionResult> {
  const supabase = await createClient();

  if (!supabase) {
    return { error: "Supabase client is not available." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be authenticated to update a task." };
  }

  if (!taskId) {
    return { error: "Task ID is required for update." };
  }

  // Validate Title
  const title = (payload.title || "").trim();
  if (!title) {
    return { error: "Task title cannot be empty." };
  }

  // Validate User Role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "ADMIN";

  // Check existing task ownership
  const { data: existingTask, error: fetchError } = await supabase
    .from("tasks")
    .select("owner_id, created_by")
    .eq("id", taskId)
    .single();

  if (fetchError || !existingTask) {
    return { error: "Task not found or access denied." };
  }

  if (!isAdmin && existingTask.owner_id !== user.id) {
    return { error: "Unauthorized: You can only edit tasks you own." };
  }

  // Blocker consistency
  const isBlocked = payload.is_blocked || payload.status === "BLOCKED";
  const blockerReason = (payload.blocker_reason || "").trim();
  if (isBlocked && !blockerReason) {
    return { error: "A blocker reason is required when a task is marked as blocked." };
  }

  // Progress logic
  let progress = Math.min(Math.max(Number(payload.progress) || 0, 0), 100);
  if (payload.status === "DONE") {
    progress = 100;
  }

  const updateData: Record<string, unknown> = {
    title,
    description: payload.description ? payload.description.trim() : null,
    support_person_id: payload.support_person_id || null,
    priority: payload.priority,
    status: payload.status,
    progress,
    due_date: payload.due_date || null,
    week_start: payload.week_start,
    is_blocked: isBlocked,
    blocker_reason: isBlocked ? blockerReason : null,
    acceptance_criteria: payload.acceptance_criteria ? payload.acceptance_criteria.trim() : null,
    goal_id: payload.goal_id || null,
    updated_at: new Date().toISOString(),
  };

  // Only admins can reassign owner_id
  if (isAdmin && payload.owner_id) {
    updateData.owner_id = payload.owner_id;
  }

  const { error } = await supabase
    .from("tasks")
    .update(updateData)
    .eq("id", taskId);

  if (error) {
    return { error: error.message || "Failed to update task." };
  }

  revalidatePath("/weekly-review");
  revalidatePath("/goals");
  revalidatePath("/team-board");
  revalidatePath("/my-tasks");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Server action to update a task's status directly (e.g. from Kanban drag-and-drop or quick menu)
 */
export async function updateTaskStatusAction(
  taskId: string,
  newStatus: TaskStatus,
  blockerReason?: string | null,
  newProgress?: number
): Promise<TaskActionResult> {
  const supabase = await createClient();

  if (!supabase) {
    return { error: "Supabase client is not available." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be authenticated to update a task status." };
  }

  if (!taskId) {
    return { error: "Task ID is required." };
  }

  // Validate User Role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "ADMIN";

  // Check existing task ownership
  const { data: existingTask, error: fetchError } = await supabase
    .from("tasks")
    .select("owner_id, status, progress, is_blocked")
    .eq("id", taskId)
    .single();

  if (fetchError || !existingTask) {
    return { error: "Task not found or access denied." };
  }

  if (!isAdmin && existingTask.owner_id !== user.id) {
    return { error: "Unauthorized: You can only update the status of tasks you own." };
  }

  // Status-specific rules
  const isBlocked = newStatus === "BLOCKED";
  const trimmedBlocker = (blockerReason || "").trim();

  if (isBlocked && !trimmedBlocker) {
    return { error: "A blocker reason is required when moving a task to Blocked." };
  }

  let progress = existingTask.progress;
  if (typeof newProgress === "number") {
    progress = Math.min(Math.max(newProgress, 0), 100);
  } else if (newStatus === "DONE") {
    progress = 100;
  } else if (newStatus === "NOT_STARTED") {
    progress = 0;
  }

  const updateData: Record<string, unknown> = {
    status: newStatus,
    is_blocked: isBlocked,
    blocker_reason: isBlocked ? trimmedBlocker : null,
    progress,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("tasks")
    .update(updateData)
    .eq("id", taskId);

  if (error) {
    return { error: error.message || "Failed to update task status." };
  }

  revalidatePath("/weekly-review");
  revalidatePath("/goals");
  revalidatePath("/team-board");
  revalidatePath("/my-tasks");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Server action to delete a task
 */
export async function deleteTaskAction(taskId: string): Promise<TaskActionResult> {
  const supabase = await createClient();

  if (!supabase) {
    return { error: "Supabase client is not available." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be authenticated to delete a task." };
  }

  if (!taskId) {
    return { error: "Task ID is required." };
  }

  // Check user role and task ownership
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "ADMIN";

  const { data: existingTask } = await supabase
    .from("tasks")
    .select("owner_id")
    .eq("id", taskId)
    .single();

  if (!existingTask) {
    return { error: "Task not found." };
  }

  if (!isAdmin && existingTask.owner_id !== user.id) {
    return { error: "Unauthorized: You can only delete tasks you own." };
  }

  // Pre-check for weekly review history
  const { data: reviews } = await supabase
    .from("task_weekly_reviews")
    .select("id")
    .eq("task_id", taskId)
    .limit(1);

  if (reviews && reviews.length > 0) {
    return { error: "This task has weekly review history and cannot be deleted." };
  }

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId);

  if (error) {
    if (error.code === "23503" || error.message?.includes("task_weekly_reviews")) {
      return { error: "This task has weekly review history and cannot be deleted." };
    }
    return { error: error.message || "Failed to delete task." };
  }

  revalidatePath("/weekly-review");
  revalidatePath("/goals");
  revalidatePath("/team-board");
  revalidatePath("/my-tasks");
  revalidatePath("/dashboard");
  return { success: true };
}
