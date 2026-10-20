"use server";

import { revalidatePath } from "next/cache";
import { requireActiveUser } from "@/lib/auth/guards";
import type { TaskStatus, TaskSubtask } from "@/types";
import {
  MAX_SUBTASKS_PER_TASK,
  canManageSubtasks,
  canToggleSubtasks,
  moveSubtask,
  nextSubtaskPosition,
  normalizeSubtaskTitle,
} from "./logic";
import { SUBTASK_COLUMNS, getSubtasksForTask } from "./queries";

/**
 * Every action returns the task's subtasks and status/progress as stored
 * after the change, so the client can reconcile its optimistic state with
 * what the database actually computed.
 */
export interface SubtaskActionResult {
  success: boolean;
  error?: string;
  subtasks?: TaskSubtask[];
  task?: { id: string; status: TaskStatus; progress: number };
}

type Guarded = NonNullable<Awaited<ReturnType<typeof requireActiveUser>>["data"]>;

interface TaskRow {
  id: string;
  owner_id: string;
  support_person_id: string | null;
  status: TaskStatus;
  progress: number;
}

async function loadTask(supabase: Guarded["supabase"], taskId: string): Promise<TaskRow | null> {
  const { data } = await supabase
    .from("tasks")
    .select("id, owner_id, support_person_id, status, progress")
    .eq("id", taskId)
    .maybeSingle();
  return (data as TaskRow | null) ?? null;
}

async function loadSubtask(
  supabase: Guarded["supabase"],
  subtaskId: string
): Promise<TaskSubtask | null> {
  const { data } = await supabase
    .from("task_subtasks")
    .select(SUBTASK_COLUMNS)
    .eq("id", subtaskId)
    .maybeSingle();
  return (data as TaskSubtask | null) ?? null;
}

async function snapshot(supabase: Guarded["supabase"], taskId: string): Promise<SubtaskActionResult> {
  const [task, subtasks] = await Promise.all([
    loadTask(supabase, taskId),
    getSubtasksForTask(supabase, taskId),
  ]);
  revalidateTaskViews();
  return {
    success: true,
    subtasks,
    task: task ? { id: task.id, status: task.status, progress: task.progress } : undefined,
  };
}

function revalidateTaskViews() {
  revalidatePath("/my-tasks");
  revalidatePath("/team-board");
  revalidatePath("/dashboard");
  revalidatePath("/goals");
  revalidatePath("/weekly-review");
}

function friendlyError(message: string | undefined, fallback: string): string {
  if (!message) return fallback;
  if (message.includes("task_subtasks") && message.toLowerCase().includes("does not exist")) {
    return "Subtasks aren't available yet: the database migration hasn't been applied.";
  }
  return message;
}

async function guardTask(
  taskId: string,
  need: "manage" | "toggle"
): Promise<{ ctx: Guarded; task: TaskRow } | { error: string }> {
  const auth = await requireActiveUser();
  if (auth.error || !auth.data) return { error: auth.error || "Authentication required." };

  if (!taskId) return { error: "Task ID is required." };
  const task = await loadTask(auth.data.supabase, taskId);
  if (!task) return { error: "Task not found." };

  const actor = { userId: auth.data.user.id, isAdmin: auth.data.isAdmin };
  const allowed = need === "manage" ? canManageSubtasks(actor, task) : canToggleSubtasks(actor, task);
  if (!allowed) {
    return {
      error:
        need === "manage"
          ? "Only the task owner or an administrator can edit subtasks."
          : "Only the task owner, support person or an administrator can tick subtasks.",
    };
  }
  return { ctx: auth.data, task };
}

async function guardSubtask(subtaskId: string, need: "manage" | "toggle") {
  const auth = await requireActiveUser();
  if (auth.error || !auth.data) return { error: auth.error || "Authentication required." } as const;
  if (!subtaskId) return { error: "Subtask ID is required." } as const;

  const subtask = await loadSubtask(auth.data.supabase, subtaskId);
  if (!subtask) return { error: "Subtask not found." } as const;

  const guarded = await guardTask(subtask.task_id, need);
  if ("error" in guarded) return guarded;
  return { ...guarded, subtask } as const;
}

export async function addSubtaskAction(taskId: string, rawTitle: string): Promise<SubtaskActionResult> {
  try {
    const parsed = normalizeSubtaskTitle(rawTitle);
    if (!parsed.ok) return { success: false, error: parsed.error };

    const guarded = await guardTask(taskId, "manage");
    if ("error" in guarded) return { success: false, error: guarded.error };
    const { ctx } = guarded;

    const existing = await getSubtasksForTask(ctx.supabase, taskId);
    if (existing.length >= MAX_SUBTASKS_PER_TASK) {
      return { success: false, error: `A task can have at most ${MAX_SUBTASKS_PER_TASK} subtasks.` };
    }

    const { error } = await ctx.supabase.from("task_subtasks").insert({
      task_id: taskId,
      title: parsed.title,
      position: nextSubtaskPosition(existing),
      created_by: ctx.user.id,
    });
    if (error) return { success: false, error: friendlyError(error.message, "Failed to add subtask.") };

    return snapshot(ctx.supabase, taskId);
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to add subtask." };
  }
}

export async function renameSubtaskAction(subtaskId: string, rawTitle: string): Promise<SubtaskActionResult> {
  try {
    const parsed = normalizeSubtaskTitle(rawTitle);
    if (!parsed.ok) return { success: false, error: parsed.error };

    const guarded = await guardSubtask(subtaskId, "manage");
    if ("error" in guarded) return { success: false, error: guarded.error };
    const { ctx, subtask } = guarded;

    const { error } = await ctx.supabase
      .from("task_subtasks")
      .update({ title: parsed.title })
      .eq("id", subtaskId);
    if (error) return { success: false, error: friendlyError(error.message, "Failed to rename subtask.") };

    return snapshot(ctx.supabase, subtask.task_id);
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to rename subtask." };
  }
}

export async function toggleSubtaskAction(subtaskId: string, isDone: boolean): Promise<SubtaskActionResult> {
  try {
    const guarded = await guardSubtask(subtaskId, "toggle");
    if ("error" in guarded) return { success: false, error: guarded.error };
    const { ctx, subtask } = guarded;

    const { error } = await ctx.supabase
      .from("task_subtasks")
      .update({ is_done: Boolean(isDone) })
      .eq("id", subtaskId);
    if (error) return { success: false, error: friendlyError(error.message, "Failed to update subtask.") };

    return snapshot(ctx.supabase, subtask.task_id);
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update subtask." };
  }
}

export async function deleteSubtaskAction(subtaskId: string): Promise<SubtaskActionResult> {
  try {
    const guarded = await guardSubtask(subtaskId, "manage");
    if ("error" in guarded) return { success: false, error: guarded.error };
    const { ctx, subtask } = guarded;

    const { error } = await ctx.supabase.from("task_subtasks").delete().eq("id", subtaskId);
    if (error) return { success: false, error: friendlyError(error.message, "Failed to delete subtask.") };

    return snapshot(ctx.supabase, subtask.task_id);
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete subtask." };
  }
}

export async function moveSubtaskAction(
  subtaskId: string,
  direction: "up" | "down"
): Promise<SubtaskActionResult> {
  try {
    if (direction !== "up" && direction !== "down") {
      return { success: false, error: "Invalid direction." };
    }
    const guarded = await guardSubtask(subtaskId, "manage");
    if ("error" in guarded) return { success: false, error: guarded.error };
    const { ctx, subtask } = guarded;

    const current = await getSubtasksForTask(ctx.supabase, subtask.task_id);
    const moved = moveSubtask(current, subtaskId, direction);
    if (!moved) return snapshot(ctx.supabase, subtask.task_id); // already at the edge

    for (const change of moved.changed) {
      const { error } = await ctx.supabase
        .from("task_subtasks")
        .update({ position: change.position })
        .eq("id", change.id);
      if (error) return { success: false, error: friendlyError(error.message, "Failed to reorder subtasks.") };
    }

    return snapshot(ctx.supabase, subtask.task_id);
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to reorder subtasks." };
  }
}
