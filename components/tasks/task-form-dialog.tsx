"use client";

import * as React from "react";
import { X, Loader2, AlertCircle, AlertTriangle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createTaskAction, updateTaskAction, TaskActionResult } from "@/lib/tasks/actions";
import { TaskWithAssignees, Profile, TaskPriority, TaskStatus, WeeklyGoal } from "@/types";

interface TaskFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task?: TaskWithAssignees | null;
  currentWeekMonday: string;
  currentUser: Profile;
  teamMembers: Profile[];
  availableGoals?: WeeklyGoal[];
  onSuccess?: () => void;
}

export function TaskFormDialog({
  isOpen,
  onClose,
  task,
  currentWeekMonday,
  currentUser,
  teamMembers,
  availableGoals = [],
  onSuccess,
}: TaskFormDialogProps) {
  const isEditing = !!task;
  const isAdmin = currentUser.role === "ADMIN";

  const [title, setTitle] = React.useState(task?.title || "");
  const [description, setDescription] = React.useState(task?.description || "");
  const [ownerId, setOwnerId] = React.useState(task?.owner_id || currentUser.id);
  const [supportPersonId, setSupportPersonId] = React.useState(task?.support_person_id || "");
  const [priority, setPriority] = React.useState<TaskPriority>(task?.priority || "MEDIUM");
  const [status, setStatus] = React.useState<TaskStatus>(task?.status || "NOT_STARTED");
  const [progress, setProgress] = React.useState<number>(task?.progress ?? 0);
  const [dueDate, setDueDate] = React.useState(task?.due_date || "");
  const [isBlocked, setIsBlocked] = React.useState(task?.is_blocked || task?.status === "BLOCKED");
  const [blockerReason, setBlockerReason] = React.useState(task?.blocker_reason || "");
  const [acceptanceCriteria, setAcceptanceCriteria] = React.useState(task?.acceptance_criteria || "");
  const [goalId, setGoalId] = React.useState<string>(task?.goal_id || "");

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Sync state when editing task changes
  React.useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setOwnerId(task.owner_id);
      setSupportPersonId(task.support_person_id || "");
      setPriority(task.priority);
      setStatus(task.status);
      setProgress(task.progress);
      setDueDate(task.due_date || "");
      setIsBlocked(task.is_blocked || task.status === "BLOCKED");
      setBlockerReason(task.blocker_reason || "");
      setAcceptanceCriteria(task.acceptance_criteria || "");
      setGoalId(task.goal_id || "");
    } else {
      setTitle("");
      setDescription("");
      setOwnerId(currentUser.id);
      setSupportPersonId("");
      setPriority("MEDIUM");
      setStatus("NOT_STARTED");
      setProgress(0);
      setDueDate("");
      setIsBlocked(false);
      setBlockerReason("");
      setAcceptanceCriteria("");
      setGoalId("");
    }
    setError(null);
  }, [task, currentUser.id, isOpen]);

  // Handle ESC key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Handle Status change automations
  const handleStatusChange = (newStatus: TaskStatus) => {
    setStatus(newStatus);
    if (newStatus === "DONE") {
      setProgress(100);
      setIsBlocked(false);
    } else if (newStatus === "BLOCKED") {
      setIsBlocked(true);
    }
  };

  const handleBlockedToggle = (blocked: boolean) => {
    setIsBlocked(blocked);
    if (blocked && status !== "BLOCKED") {
      setStatus("BLOCKED");
    } else if (!blocked && status === "BLOCKED") {
      setStatus("IN_PROGRESS");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    if (isBlocked && !blockerReason.trim()) {
      setError("Please provide a blocker reason for blocked tasks.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        owner_id: isAdmin ? ownerId : currentUser.id,
        support_person_id: supportPersonId || null,
        priority,
        status,
        progress: status === "DONE" ? 100 : Number(progress),
        due_date: dueDate || null,
        week_start: task?.week_start || currentWeekMonday,
        is_blocked: isBlocked,
        blocker_reason: isBlocked ? blockerReason.trim() : null,
        acceptance_criteria: acceptanceCriteria.trim() || null,
        goal_id: goalId || null,
      };

      let res: TaskActionResult;
      if (isEditing && task) {
        res = await updateTaskAction(task.id, payload);
      } else {
        res = await createTaskAction(payload);
      }

      if (res.error) {
        setError(res.error);
        setIsSubmitting(false);
      } else {
        setIsSubmitting(false);
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        className="relative w-full max-w-lg rounded-xl border border-zinc-200 bg-white shadow-xl transition-all dark:border-zinc-800 dark:bg-zinc-900 my-8 max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2 id="task-dialog-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {isEditing ? "Edit Weekly Task" : "Create Weekly Task"}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Week of {currentWeekMonday}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-500 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-xs">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="taskTitle" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Task Title <span className="text-amber-600">*</span>
            </label>
            <input
              id="taskTitle"
              type="text"
              required
              maxLength={255}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement user authentication middleware"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="taskDescription" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Description <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="taskDescription"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add key context, dependencies, or links..."
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          {/* Goal Link (Optional) */}
          {availableGoals && availableGoals.length > 0 && (
            <div className="space-y-1.5">
              <label htmlFor="taskGoal" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <Target className="h-3.5 w-3.5 text-amber-600" />
                <span>Link to Weekly Company Goal <span className="text-zinc-400 font-normal">(optional)</span></span>
              </label>
              <select
                id="taskGoal"
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <option value="">None (Individual / Unlinked Task)</option>
                {availableGoals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Grid: Assignee & Support Person */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Owner */}
            <div className="space-y-1.5">
              <label htmlFor="taskOwner" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Assignee / Owner
              </label>
              {isAdmin ? (
                <select
                  id="taskOwner"
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name || m.email} {m.role === "ADMIN" ? "(Admin)" : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex h-9 items-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-700 font-medium dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {currentUser.full_name || currentUser.email} (You)
                </div>
              )}
            </div>

            {/* Support Person */}
            <div className="space-y-1.5">
              <label htmlFor="supportPerson" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Support Person <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <select
                id="supportPerson"
                value={supportPersonId}
                onChange={(e) => setSupportPersonId(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <option value="">None</option>
                {teamMembers
                  .filter((m) => m.id !== ownerId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name || m.email}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Grid: Priority, Status, Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Priority */}
            <div className="space-y-1.5">
              <label htmlFor="taskPriority" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Priority
              </label>
              <select
                id="taskPriority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <option value="CRITICAL">Critical (P0)</option>
                <option value="HIGH">High (P1)</option>
                <option value="MEDIUM">Medium (P2)</option>
                <option value="LOW">Low (P3)</option>
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label htmlFor="taskStatus" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Status
              </label>
              <select
                id="taskStatus"
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <label htmlFor="dueDate" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Due Date <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Progress Slider */}
          <div className="space-y-1.5 rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
            <div className="flex items-center justify-between">
              <label htmlFor="taskProgress" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Progress Percentage
              </label>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">{progress}%</span>
            </div>
            <input
              id="taskProgress"
              type="range"
              min="0"
              max="100"
              step="5"
              disabled={status === "DONE"}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>

          {/* Blocker Section */}
          <div className="rounded-lg border border-zinc-200 p-3 space-y-2 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Is this task blocked?
                </span>
              </div>
              <input
                type="checkbox"
                id="isBlockedToggle"
                checked={isBlocked}
                onChange={(e) => handleBlockedToggle(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
              />
            </div>

            {isBlocked && (
              <div className="pt-2 space-y-1">
                <label htmlFor="blockerReason" className="block text-xs font-semibold text-rose-700 dark:text-rose-400">
                  Blocker Reason <span className="text-rose-600">*</span>
                </label>
                <input
                  id="blockerReason"
                  type="text"
                  required={isBlocked}
                  value={blockerReason}
                  onChange={(e) => setBlockerReason(e.target.value)}
                  placeholder="What is blocking execution? (e.g. Waiting on API docs)"
                  className="w-full rounded-lg border border-rose-300 bg-rose-50/40 px-3 py-1.5 text-xs text-rose-900 placeholder-rose-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
                />
              </div>
            )}
          </div>

          {/* Acceptance Criteria */}
          <div className="space-y-1.5">
            <label htmlFor="acceptanceCriteria" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Acceptance Criteria <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="acceptanceCriteria"
              rows={2}
              value={acceptanceCriteria}
              onChange={(e) => setAcceptanceCriteria(e.target.value)}
              placeholder="Definition of done / verification checklist..."
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-zinc-900 text-white hover:bg-zinc-800 text-xs dark:bg-amber-500 dark:text-zinc-950 dark:hover:bg-amber-600"
            >
              {isSubmitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Task"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
