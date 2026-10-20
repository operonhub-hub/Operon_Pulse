import type { TaskStatus, TaskSubtask } from "@/types";

/**
 * Pure subtask rules shared by the UI (optimistic updates), Server Actions
 * (pre-checks) and tests. The database enforces the same rules in
 * supabase/migrations/20261020000000_add_task_subtasks.sql; keep them in sync.
 */

export const SUBTASK_TITLE_MAX_LENGTH = 255;
export const MAX_SUBTASKS_PER_TASK = 50;

export const PROGRESS_FROM_SUBTASKS_ERROR =
  "Progress is calculated from subtasks and can't be set manually.";

type SubtaskLike = Pick<TaskSubtask, "is_done">;

export interface SubtaskCounts {
  done: number;
  total: number;
}

export function getSubtaskCounts(subtasks: readonly SubtaskLike[] | null | undefined): SubtaskCounts {
  const list = subtasks ?? [];
  return { done: list.filter((s) => s.is_done).length, total: list.length };
}

/**
 * round(done / total * 100), or null when there are no subtasks
 * (progress stays manual). Matches Postgres round() for these values.
 */
export function computeSubtaskProgress(subtasks: readonly SubtaskLike[] | null | undefined): number | null {
  const { done, total } = getSubtaskCounts(subtasks);
  if (total === 0) return null;
  return Math.round((done / total) * 100);
}

export function hasSubtasks(subtasks: readonly SubtaskLike[] | null | undefined): boolean {
  return (subtasks?.length ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Permissions (mirror can_manage_task_subtasks / can_toggle_task_subtasks)
// ---------------------------------------------------------------------------

export interface SubtaskActor {
  userId: string | null | undefined;
  isAdmin: boolean;
}

export interface SubtaskTaskRef {
  owner_id: string;
  support_person_id?: string | null;
}

/** Owner or admin: add, rename, reorder and delete subtasks. */
export function canManageSubtasks(actor: SubtaskActor, task: SubtaskTaskRef): boolean {
  if (!actor.userId) return false;
  return actor.isAdmin || task.owner_id === actor.userId;
}

/** Owner, support person or admin: tick and untick subtasks. */
export function canToggleSubtasks(actor: SubtaskActor, task: SubtaskTaskRef): boolean {
  if (!actor.userId) return false;
  return (
    actor.isAdmin ||
    task.owner_id === actor.userId ||
    (!!task.support_person_id && task.support_person_id === actor.userId)
  );
}

// ---------------------------------------------------------------------------
// Status / progress after a subtask change (mirror sync_task_from_subtasks
// and apply_subtask_progress)
// ---------------------------------------------------------------------------

export interface SubtaskChange {
  /** A subtask went from open to done (or was added already done). */
  newlyDone: boolean;
}

/**
 * - A subtask becoming done while the task is NOT_STARTED -> IN_PROGRESS.
 * - A DONE task that now has an open subtask -> IN_PROGRESS (reopened).
 * - Otherwise the status is unchanged; all done does NOT auto-complete.
 */
export function statusAfterSubtaskChange(
  currentStatus: TaskStatus,
  subtasksAfter: readonly SubtaskLike[],
  change: SubtaskChange
): TaskStatus {
  const hasOpen = subtasksAfter.some((s) => !s.is_done);
  if (change.newlyDone && currentStatus === "NOT_STARTED") return "IN_PROGRESS";
  if (hasOpen && currentStatus === "DONE") return "IN_PROGRESS";
  return currentStatus;
}

/**
 * Progress the database will store: DONE is always 100; otherwise derived
 * from subtasks when any exist; otherwise the existing manual value is kept.
 */
export function progressAfterSubtaskChange(
  status: TaskStatus,
  subtasksAfter: readonly SubtaskLike[],
  currentProgress: number
): number {
  if (status === "DONE") return 100;
  return computeSubtaskProgress(subtasksAfter) ?? currentProgress;
}

export function deriveTaskStateAfterSubtaskChange(
  task: { status: TaskStatus; progress: number },
  subtasksAfter: readonly SubtaskLike[],
  change: SubtaskChange
): { status: TaskStatus; progress: number } {
  const status = statusAfterSubtaskChange(task.status, subtasksAfter, change);
  return { status, progress: progressAfterSubtaskChange(status, subtasksAfter, task.progress) };
}

/** "All subtasks done. Mark task as Done?" */
export function shouldPromptMarkDone(
  status: TaskStatus,
  subtasks: readonly SubtaskLike[] | null | undefined
): boolean {
  const { done, total } = getSubtaskCounts(subtasks);
  return total > 0 && done === total && status !== "DONE";
}

/** Number of open subtasks; used to warn before marking a task Done. */
export function getOpenSubtaskCount(subtasks: readonly SubtaskLike[] | null | undefined): number {
  const { done, total } = getSubtaskCounts(subtasks);
  return total - done;
}

// ---------------------------------------------------------------------------
// Titles and ordering
// ---------------------------------------------------------------------------

export type TitleResult = { ok: true; title: string } | { ok: false; error: string };

export function normalizeSubtaskTitle(raw: unknown): TitleResult {
  const title = typeof raw === "string" ? raw.trim() : "";
  if (!title) return { ok: false, error: "Subtask title can't be empty." };
  if (title.length > SUBTASK_TITLE_MAX_LENGTH) {
    return { ok: false, error: `Subtask title must be ${SUBTASK_TITLE_MAX_LENGTH} characters or fewer.` };
  }
  return { ok: true, title };
}

export function sortSubtasks<T extends Pick<TaskSubtask, "position" | "created_at">>(subtasks: readonly T[]): T[] {
  return [...subtasks].sort(
    (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at)
  );
}

/** Position for a new subtask appended at the end. */
export function nextSubtaskPosition(subtasks: readonly Pick<TaskSubtask, "position">[]): number {
  return subtasks.reduce((max, s) => Math.max(max, s.position + 1), 0);
}

/**
 * Moves a subtask one step up or down. Returns the reordered list with
 * positions renumbered 0..n-1, plus only the rows whose position changed
 * (what needs persisting). Returns null when the move isn't possible.
 */
export function moveSubtask<T extends Pick<TaskSubtask, "id" | "position" | "created_at">>(
  subtasks: readonly T[],
  subtaskId: string,
  direction: "up" | "down"
): { ordered: T[]; changed: { id: string; position: number }[] } | null {
  const ordered = sortSubtasks(subtasks);
  const index = ordered.findIndex((s) => s.id === subtaskId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= ordered.length) return null;

  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

  const changed: { id: string; position: number }[] = [];
  const renumbered = ordered.map((s, i) => {
    if (s.position !== i) changed.push({ id: s.id, position: i });
    return { ...s, position: i };
  });
  return { ordered: renumbered, changed };
}
