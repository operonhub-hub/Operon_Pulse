import type { TaskSubtask, TaskWithAssignees } from "@/types";
import type { createClient } from "@/lib/supabase/server";
import { sortSubtasks } from "./logic";

type ServerClient = NonNullable<Awaited<ReturnType<typeof createClient>>>;

export const SUBTASK_COLUMNS =
  "id, task_id, title, is_done, position, created_by, completed_at, created_at, updated_at";

/**
 * Loads subtasks for a set of tasks, grouped by task_id and ordered by position.
 * Fails soft (returns an empty map) so task pages keep working if the
 * task_subtasks migration hasn't been applied yet.
 */
export async function getSubtasksByTaskIds(
  supabase: ServerClient,
  taskIds: string[]
): Promise<Map<string, TaskSubtask[]>> {
  const grouped = new Map<string, TaskSubtask[]>();
  if (taskIds.length === 0) return grouped;

  const { data, error } = await supabase
    .from("task_subtasks")
    .select(SUBTASK_COLUMNS)
    .in("task_id", taskIds);

  if (error || !data) return grouped;

  for (const row of data as TaskSubtask[]) {
    const list = grouped.get(row.task_id) ?? [];
    list.push(row);
    grouped.set(row.task_id, list);
  }
  for (const [taskId, list] of grouped) {
    grouped.set(taskId, sortSubtasks(list));
  }
  return grouped;
}

/** Returns the tasks with a `subtasks` array attached (empty when none). */
export async function attachSubtasks(
  supabase: ServerClient,
  tasks: TaskWithAssignees[]
): Promise<TaskWithAssignees[]> {
  const byTask = await getSubtasksByTaskIds(
    supabase,
    tasks.map((t) => t.id)
  );
  return tasks.map((t) => ({ ...t, subtasks: byTask.get(t.id) ?? [] }));
}

/** Ordered subtasks for one task (empty on error or when none). */
export async function getSubtasksForTask(
  supabase: ServerClient,
  taskId: string
): Promise<TaskSubtask[]> {
  return (await getSubtasksByTaskIds(supabase, [taskId])).get(taskId) ?? [];
}

/** True when the task has at least one subtask (false on error). */
export async function taskHasSubtasks(supabase: ServerClient, taskId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("task_subtasks")
    .select("id", { count: "exact", head: true })
    .eq("task_id", taskId);
  return !error && (count ?? 0) > 0;
}
