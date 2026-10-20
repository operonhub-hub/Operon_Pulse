"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";
import type { TaskStatus, TaskSubtask } from "@/types";
import {
  MAX_SUBTASKS_PER_TASK,
  SUBTASK_TITLE_MAX_LENGTH,
  deriveTaskStateAfterSubtaskChange,
  getSubtaskCounts,
  moveSubtask,
  nextSubtaskPosition,
  normalizeSubtaskTitle,
  shouldPromptMarkDone,
  sortSubtasks,
} from "@/lib/subtasks/logic";
import {
  addSubtaskAction,
  deleteSubtaskAction,
  moveSubtaskAction,
  renameSubtaskAction,
  toggleSubtaskAction,
  type SubtaskActionResult,
} from "@/lib/subtasks/actions";

export interface TaskStateUpdate {
  status: TaskStatus;
  progress: number;
}

interface SubtaskChecklistProps {
  /**
   * "live": an existing task; every change saves immediately (optimistic,
   * rolled back on error). "staged": a task being created; changes are held
   * locally and handed to the parent via onSubtasksChange.
   */
  mode: "live" | "staged";
  taskId?: string;
  subtasks: TaskSubtask[];
  taskStatus: TaskStatus;
  taskProgress: number;
  /** Owner or admin: add, rename, reorder, delete. */
  canManage: boolean;
  /** Owner, support person or admin: tick. */
  canToggle: boolean;
  /** Owner or admin may act on the "Mark task as Done?" prompt. */
  canMarkDone: boolean;
  onSubtasksChange?: (subtasks: TaskSubtask[]) => void;
  onTaskStateChange?: (state: TaskStateUpdate) => void;
  onMarkDone?: () => void | Promise<void>;
  /** Visually compact variant for the read-only detail view. */
  compact?: boolean;
}

let tempCounter = 0;
const tempId = () => `tmp-${Date.now()}-${tempCounter++}`;

export function SubtaskChecklist({
  mode,
  taskId,
  subtasks: initialSubtasks,
  taskStatus,
  taskProgress,
  canManage,
  canToggle,
  canMarkDone,
  onSubtasksChange,
  onTaskStateChange,
  onMarkDone,
  compact = false,
}: SubtaskChecklistProps) {
  const [items, setItems] = React.useState<TaskSubtask[]>(() => sortSubtasks(initialSubtasks));
  const [newTitle, setNewTitle] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingTitle, setEditingTitle] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(0);
  const [markingDone, setMarkingDone] = React.useState(false);

  // Last state the server confirmed (live mode): the rollback target on error
  const confirmed = React.useRef<TaskSubtask[]>(sortSubtasks(initialSubtasks));
  const latestRequest = React.useRef(0);
  const addInputRef = React.useRef<HTMLInputElement>(null);
  const status = React.useRef(taskStatus);
  status.current = taskStatus;

  const counts = getSubtaskCounts(items);
  const showPrompt = shouldPromptMarkDone(taskStatus, items);

  const commitLocal = (next: TaskSubtask[], newlyDone = false) => {
    setItems(next);
    onSubtasksChange?.(next);
    onTaskStateChange?.(
      deriveTaskStateAfterSubtaskChange({ status: status.current, progress: taskProgress }, next, { newlyDone })
    );
  };

  /** Applies an optimistic change, runs the action, then reconciles or rolls back. */
  const runLive = async (
    optimistic: TaskSubtask[],
    newlyDone: boolean,
    action: () => Promise<SubtaskActionResult>
  ) => {
    setError(null);
    commitLocal(optimistic, newlyDone);
    const request = ++latestRequest.current;
    setPending((n) => n + 1);
    try {
      const res = await action();
      if (!res.success || !res.subtasks) {
        throw new Error(res.error || "Couldn't save the change.");
      }
      confirmed.current = res.subtasks;
      // Ignore stale responses when a newer change is already in flight
      if (request === latestRequest.current) {
        setItems(res.subtasks);
        onSubtasksChange?.(res.subtasks);
        if (res.task) onTaskStateChange?.({ status: res.task.status, progress: res.task.progress });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't save the change.");
      setItems(confirmed.current);
      onSubtasksChange?.(confirmed.current);
      onTaskStateChange?.(
        deriveTaskStateAfterSubtaskChange(
          { status: status.current, progress: taskProgress },
          confirmed.current,
          { newlyDone: false }
        )
      );
    } finally {
      setPending((n) => n - 1);
    }
  };

  // ---------------------------------------------------------------------------
  // Operations
  // ---------------------------------------------------------------------------

  const handleAdd = () => {
    const parsed = normalizeSubtaskTitle(newTitle);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    if (items.length >= MAX_SUBTASKS_PER_TASK) {
      setError(`A task can have at most ${MAX_SUBTASKS_PER_TASK} subtasks.`);
      return;
    }
    const now = new Date().toISOString();
    const draft: TaskSubtask = {
      id: tempId(),
      task_id: taskId ?? "",
      title: parsed.title,
      is_done: false,
      position: nextSubtaskPosition(items),
      created_by: "",
      completed_at: null,
      created_at: now,
      updated_at: now,
    };
    const next = [...items, draft];
    setNewTitle("");
    // Keep focus in the input so Enter adds the next subtask
    addInputRef.current?.focus();

    if (mode === "staged") {
      setError(null);
      commitLocal(next);
    } else if (taskId) {
      void runLive(next, false, () => addSubtaskAction(taskId, parsed.title));
    }
  };

  const handleToggle = (subtask: TaskSubtask) => {
    const isDone = !subtask.is_done;
    const next = items.map((s) =>
      s.id === subtask.id
        ? { ...s, is_done: isDone, completed_at: isDone ? new Date().toISOString() : null }
        : s
    );
    if (mode === "staged") {
      setError(null);
      commitLocal(next, isDone);
    } else {
      void runLive(next, isDone, () => toggleSubtaskAction(subtask.id, isDone));
    }
  };

  // Ref mirrors editingId so Enter followed by blur saves only once
  const editingRef = React.useRef<string | null>(null);

  const startRename = (subtask: TaskSubtask) => {
    editingRef.current = subtask.id;
    setEditingId(subtask.id);
    setEditingTitle(subtask.title);
  };

  const cancelRename = () => {
    editingRef.current = null;
    setEditingId(null);
    setEditingTitle("");
  };

  const saveRename = (subtask: TaskSubtask) => {
    if (editingRef.current !== subtask.id) return;
    const parsed = normalizeSubtaskTitle(editingTitle);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    cancelRename();
    if (parsed.title === subtask.title) return;
    const next = items.map((s) => (s.id === subtask.id ? { ...s, title: parsed.title } : s));
    if (mode === "staged") {
      setError(null);
      commitLocal(next);
    } else {
      void runLive(next, false, () => renameSubtaskAction(subtask.id, parsed.title));
    }
  };

  const handleDelete = (subtask: TaskSubtask) => {
    const next = items.filter((s) => s.id !== subtask.id);
    if (mode === "staged") {
      setError(null);
      commitLocal(next.map((s, i) => ({ ...s, position: i })));
    } else {
      void runLive(next, false, () => deleteSubtaskAction(subtask.id));
    }
  };

  const handleMove = (subtask: TaskSubtask, direction: "up" | "down") => {
    const moved = moveSubtask(items, subtask.id, direction);
    if (!moved) return;
    if (mode === "staged") {
      setError(null);
      commitLocal(moved.ordered);
    } else {
      void runLive(moved.ordered, false, () => moveSubtaskAction(subtask.id, direction));
    }
  };

  const handleMarkDone = async () => {
    if (!onMarkDone) return;
    setMarkingDone(true);
    try {
      await onMarkDone();
    } finally {
      setMarkingDone(false);
    }
  };

  // Inputs live inside the task <form>: Enter must not submit it, and Escape
  // while renaming must not close the dialog.
  const onAddKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const onRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, subtask: TaskSubtask) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveRename(subtask);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancelRename();
    }
  };

  const readOnly = !canManage && !canToggle;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <section
      aria-labelledby={`subtasks-heading-${taskId ?? "new"}`}
      className={`rounded-lg border border-zinc-200 dark:border-zinc-800 ${compact ? "p-3" : "p-3 space-y-2"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3
          id={`subtasks-heading-${taskId ?? "new"}`}
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200"
        >
          <ListChecks className="h-4 w-4 text-amber-600" aria-hidden="true" />
          Subtasks
          {counts.total > 0 && (
            <span className="font-normal text-zinc-500" aria-label={`${counts.done} of ${counts.total} done`}>
              {counts.done}/{counts.total}
            </span>
          )}
        </h3>
        <span className="flex items-center gap-1 text-[11px] text-zinc-500" aria-live="polite">
          {pending > 0 && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              Saving…
            </>
          )}
          {pending === 0 && mode === "live" && canManage && counts.total > 0 && "Changes save instantly"}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-2 flex items-start gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-medium text-rose-700"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-px" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {items.length === 0 && readOnly && (
        <p className="mt-2 text-[11px] text-zinc-500">No subtasks.</p>
      )}

      {items.length > 0 && (
        <ul className="mt-2 space-y-1" aria-label="Subtasks">
          {items.map((subtask, index) => {
            const isEditing = editingId === subtask.id;
            const isTemp = subtask.id.startsWith("tmp-");
            return (
              <li
                key={subtask.id}
                className="group flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <input
                  type="checkbox"
                  id={`subtask-${subtask.id}`}
                  checked={subtask.is_done}
                  disabled={!canToggle || (mode === "live" && isTemp)}
                  onChange={() => handleToggle(subtask)}
                  className="h-4 w-4 shrink-0 rounded border-zinc-300 text-amber-600 focus:ring-amber-500 disabled:opacity-50"
                />

                {isEditing ? (
                  <input
                    type="text"
                    value={editingTitle}
                    maxLength={SUBTASK_TITLE_MAX_LENGTH}
                    autoFocus
                    aria-label="Subtask title"
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => onRenameKeyDown(e, subtask)}
                    onBlur={() => saveRename(subtask)}
                    className="min-w-0 flex-1 rounded border border-amber-400 bg-white px-1.5 py-0.5 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                ) : (
                  <label
                    htmlFor={`subtask-${subtask.id}`}
                    className={`min-w-0 flex-1 break-words text-xs ${
                      subtask.is_done ? "text-zinc-400 line-through" : "text-zinc-800 dark:text-zinc-200"
                    } ${canToggle ? "cursor-pointer" : ""}`}
                  >
                    {subtask.title}
                  </label>
                )}

                {canManage && !isEditing && (
                  <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    <IconButton label={`Rename "${subtask.title}"`} onClick={() => startRename(subtask)} disabled={isTemp}>
                      <Pencil className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton
                      label={`Move "${subtask.title}" up`}
                      onClick={() => handleMove(subtask, "up")}
                      disabled={index === 0 || isTemp}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton
                      label={`Move "${subtask.title}" down`}
                      onClick={() => handleMove(subtask, "down")}
                      disabled={index === items.length - 1 || isTemp}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton
                      label={`Delete "${subtask.title}"`}
                      onClick={() => handleDelete(subtask)}
                      disabled={isTemp}
                      tone="danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canManage && (
        <div className="mt-2 flex items-center gap-2">
          <input
            ref={addInputRef}
            type="text"
            value={newTitle}
            maxLength={SUBTASK_TITLE_MAX_LENGTH}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={onAddKeyDown}
            placeholder={items.length === 0 ? "Add a subtask, press Enter for the next" : "Add another subtask"}
            aria-label="New subtask title"
            className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newTitle.trim()}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add
          </button>
        </div>
      )}

      {showPrompt && (
        <div
          role="status"
          className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs text-emerald-800"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {canMarkDone ? "All subtasks done. Mark task as Done?" : "All subtasks done. The owner can mark it as Done."}
          </span>
          {canMarkDone && onMarkDone && (
            <button
              type="button"
              onClick={handleMarkDone}
              disabled={markingDone}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {markingDone && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
              Mark as Done
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  tone = "default",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`rounded p-1 text-zinc-400 disabled:opacity-30 ${
        tone === "danger" ? "hover:bg-rose-50 hover:text-rose-600" : "hover:bg-zinc-100 hover:text-zinc-700"
      }`}
    >
      {children}
    </button>
  );
}
