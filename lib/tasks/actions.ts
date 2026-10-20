"use server";

import { revalidatePath } from "next/cache";
import { requireActiveUser } from "@/lib/auth/guards";
import { TaskPriority, TaskStatus } from "@/types";
import {
  MAX_SUBTASKS_PER_TASK,
  PROGRESS_FROM_SUBTASKS_ERROR,
  normalizeSubtaskTitle,
} from "@/lib/subtasks/logic";
import { taskHasSubtasks } from "@/lib/subtasks/queries";

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
  /** Omit when the task has (or is being created with) subtasks: progress is then calculated. */
  progress?: number;
  due_date?: string | null;
  week_start: string;
  is_blocked?: boolean;
  blocker_reason?: string | null;
  acceptance_criteria?: string | null;
  goal_id?: string | null;
  /** Create only: initial checklist, in order. */
  subtasks?: { title: string; is_done?: boolean }[];
}

/**
 * Server action to create a new task
 */
export async function createTaskAction(
  payload: TaskFormPayload
): Promise<TaskActionResult> {
  const authResult = await requireActiveUser();
  if (authResult.error || !authResult.data) {
    return { error: authResult.error || "Authentication required." };
  }

  const { supabase, user, isAdmin } = authResult.data;

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

  // Ownership: Members must own their tasks; Admins may assign to others
  const ownerId = isAdmin && payload.owner_id ? payload.owner_id : user.id;

  // Validate Blocker
  const isBlocked = payload.is_blocked || payload.status === "BLOCKED";
  const blockerReason = (payload.blocker_reason || "").trim();
  if (isBlocked && !blockerReason) {
    return { error: "A blocker reason is required when a task is marked as blocked." };
  }

  // Validate initial subtasks
  const subtaskRows: { title: string; is_done: boolean; position: number }[] = [];
  for (const [index, item] of (payload.subtasks ?? []).entries()) {
    const parsed = normalizeSubtaskTitle(item?.title);
    if (!parsed.ok) {
      return { error: `Subtask ${index + 1}: ${parsed.error}` };
    }
    subtaskRows.push({ title: parsed.title, is_done: Boolean(item.is_done), position: index });
  }
  if (subtaskRows.length > MAX_SUBTASKS_PER_TASK) {
    return { error: `A task can have at most ${MAX_SUBTASKS_PER_TASK} subtasks.` };
  }
  if (subtaskRows.length > 0 && payload.progress !== undefined) {
    return { error: PROGRESS_FROM_SUBTASKS_ERROR };
  }

  // Validate Progress (the database recalculates it once subtasks are inserted)
  let progress = Math.min(Math.max(Number(payload.progress) || 0, 0), 100);
  if (payload.status === "DONE") {
    progress = 100;
  }

  // Validate Goal Week Alignment if goal_id is provided
  if (payload.goal_id) {
    const { data: goalData, error: goalError } = await supabase
      .from("weekly_goals")
      .select("id, week_start")
      .eq("id", payload.goal_id)
      .maybeSingle();

    if (goalError || !goalData) {
      return { error: "The selected weekly goal was not found." };
    }

    if (goalData.week_start !== weekStart) {
      return { error: "Linked goal must belong to the same execution week as the task." };
    }
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

  if (subtaskRows.length > 0 && data?.id) {
    const { error: subtaskError } = await supabase.from("task_subtasks").insert(
      subtaskRows.map((row) => ({ ...row, task_id: data.id, created_by: user.id }))
    );
    if (subtaskError) {
      // Don't leave a task without the checklist the user asked for
      await supabase.from("tasks").delete().eq("id", data.id);
      return {
        error: subtaskError.message?.includes("task_subtasks")
          ? "Subtasks aren't available yet: the database migration hasn't been applied."
          : subtaskError.message || "Failed to save subtasks. The task was not created.",
      };
    }
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
  const authResult = await requireActiveUser();
  if (authResult.error || !authResult.data) {
    return { error: authResult.error || "Authentication required." };
  }

  const { supabase, user, isAdmin } = authResult.data;

  if (!taskId) {
    return { error: "Task ID is required for update." };
  }

  // Validate Title
  const title = (payload.title || "").trim();
  if (!title) {
    return { error: "Task title cannot be empty." };
  }

  // Check existing task ownership
  const { data: existingTask, error: fetchError } = await supabase
    .from("tasks")
    .select("owner_id, created_by, week_start")
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

  // Progress logic: tasks with subtasks get progress from the database
  const hasSubtasks = await taskHasSubtasks(supabase, taskId);
  if (hasSubtasks && payload.progress !== undefined) {
    return { error: PROGRESS_FROM_SUBTASKS_ERROR };
  }
  let progress = Math.min(Math.max(Number(payload.progress) || 0, 0), 100);
  if (payload.status === "DONE") {
    progress = 100;
  }

  // Validate Goal Week Alignment if goal_id is provided
  const targetWeekStart = payload.week_start || existingTask.week_start;
  if (payload.goal_id) {
    const { data: goalData, error: goalError } = await supabase
      .from("weekly_goals")
      .select("id, week_start")
      .eq("id", payload.goal_id)
      .maybeSingle();

    if (goalError || !goalData) {
      return { error: "The selected weekly goal was not found." };
    }

    if (goalData.week_start !== targetWeekStart) {
      return { error: "Linked goal must belong to the same execution week as the task." };
    }
  }

  const updateData: Record<string, unknown> = {
    title,
    description: payload.description ? payload.description.trim() : null,
    support_person_id: payload.support_person_id || null,
    priority: payload.priority,
    status: payload.status,
    due_date: payload.due_date || null,
    week_start: payload.week_start,
    is_blocked: isBlocked,
    blocker_reason: isBlocked ? blockerReason : null,
    acceptance_criteria: payload.acceptance_criteria ? payload.acceptance_criteria.trim() : null,
    goal_id: payload.goal_id || null,
    updated_at: new Date().toISOString(),
  };

  // Only write progress when the client sent one (it omits it for subtask-driven tasks)
  if (!hasSubtasks && payload.progress !== undefined) {
    updateData.progress = progress;
  }

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
  const authResult = await requireActiveUser();
  if (authResult.error || !authResult.data) {
    return { error: authResult.error || "Authentication required." };
  }

  const { supabase, user, isAdmin } = authResult.data;

  if (!taskId) {
    return { error: "Task ID is required." };
  }

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

  // Tasks with subtasks: progress comes from the database, never from the client
  const hasSubtasks = await taskHasSubtasks(supabase, taskId);
  if (hasSubtasks && typeof newProgress === "number") {
    return { error: PROGRESS_FROM_SUBTASKS_ERROR };
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
    updated_at: new Date().toISOString(),
  };
  if (!hasSubtasks) {
    updateData.progress = progress;
  }

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
  const authResult = await requireActiveUser();
  if (authResult.error || !authResult.data) {
    return { error: authResult.error || "Authentication required." };
  }

  const { supabase, user, isAdmin } = authResult.data;

  if (!taskId) {
    return { error: "Task ID is required." };
  }

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
