"use client";

import * as React from "react";
import {
  AlertCircle,
  ArrowRight,
  ArrowRightLeft,
  Ban,
  Check,
  Clock,
  Loader2,
  Lock,
  UserCheck,
  X,
} from "lucide-react";
import { TaskWithAssignees, Profile, WeeklyGoal, TaskReviewOutcome } from "@/types";
import { recordTaskReviewAction, rolloverTaskAction } from "@/lib/reviews/actions";
import { getNextMondayDateString } from "@/lib/utils/date";
import { Button } from "@/components/ui/button";

interface TaskReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskWithAssignees | null;
  currentWeekMonday: string;
  nextWeekMonday?: string;
  currentUser: Profile;
  teamMembers: Profile[];
  nextWeekGoals: WeeklyGoal[];
  onSuccess?: () => void;
}

export function TaskReviewDialog({
  isOpen,
  onClose,
  task,
  currentWeekMonday,
  nextWeekMonday,
  currentUser,
  teamMembers,
  nextWeekGoals = [],
  onSuccess,
}: TaskReviewDialogProps) {
  const isAdmin = currentUser.role === "ADMIN";
  const defaultTargetWeek = nextWeekMonday || getNextMondayDateString(currentWeekMonday);

  const [outcome, setOutcome] = React.useState<TaskReviewOutcome>("CARRY_FORWARD");
  const [targetWeek, setTargetWeek] = React.useState<string>(defaultTargetWeek);
  const [rolloverNote, setRolloverNote] = React.useState<string>("");
  const [newOwnerId, setNewOwnerId] = React.useState<string>(task?.owner_id || currentUser.id);
  const [newGoalId, setNewGoalId] = React.useState<string>("");
  const [dueDate, setDueDate] = React.useState<string>("");

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (task) {
      setNewOwnerId(task.owner_id);
      setOutcome("CARRY_FORWARD");
      setTargetWeek(defaultTargetWeek);
      setRolloverNote("");
      setNewGoalId("");
      setDueDate("");
      setErrorMessage(null);
    }
  }, [task, defaultTargetWeek]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (outcome === "CARRY_FORWARD" || outcome === "REASSIGN") {
        const res = await rolloverTaskAction({
          taskId: task.id,
          sourceWeek: task.week_start || currentWeekMonday,
          targetWeek: targetWeek,
          note: rolloverNote,
          newOwnerId: outcome === "REASSIGN" ? newOwnerId : undefined,
          newGoalId: newGoalId ? newGoalId : undefined,
          dueDate: dueDate ? dueDate : undefined,
        });

        if (!res.success) {
          setErrorMessage(res.error || "Failed to carry forward task.");
          setIsSubmitting(false);
          return;
        }
      } else {
        // CANCEL or KEEP_IN_WEEK
        const res = await recordTaskReviewAction({
          taskId: task.id,
          weekStart: task.week_start || currentWeekMonday,
          outcome: outcome as "CANCEL" | "KEEP_IN_WEEK",
          note: rolloverNote,
        });

        if (!res.success) {
          setErrorMessage(res.error || "Failed to record review decision.");
          setIsSubmitting(false);
          return;
        }
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch {
      setErrorMessage("An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-review-dialog-title"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-800 dark:bg-stone-900 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4 dark:border-stone-800">
          <div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 mb-1">
              <ArrowRightLeft className="h-3 w-3" /> End-of-Week Review
            </span>
            <h3
              id="task-review-dialog-title"
              className="text-lg font-bold text-stone-900 dark:text-stone-100"
            >
              Review Unfinished Task
            </h3>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Decide the disposition of &ldquo;{task.title}&rdquo; for upcoming sprints.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Review Outcome Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
              Select Decision Outcome *
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {/* Option 1: Carry Forward */}
              <button
                type="button"
                onClick={() => setOutcome("CARRY_FORWARD")}
                className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                  outcome === "CARRY_FORWARD"
                    ? "border-amber-500 bg-amber-50/60 text-amber-950 ring-1 ring-amber-500 dark:bg-amber-950/40 dark:text-amber-100"
                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-300"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <ArrowRight className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    Carry Forward
                  </span>
                  {outcome === "CARRY_FORWARD" && <Check className="h-3.5 w-3.5 text-amber-600" />}
                </div>
                <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400 leading-tight">
                  Creates a new task copy in the next week.
                </p>
              </button>

              {/* Option 2: Keep in Week */}
              <button
                type="button"
                onClick={() => setOutcome("KEEP_IN_WEEK")}
                className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                  outcome === "KEEP_IN_WEEK"
                    ? "border-amber-500 bg-amber-50/60 text-amber-950 ring-1 ring-amber-500 dark:bg-amber-950/40 dark:text-amber-100"
                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-300"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-stone-500" />
                    Keep in Week
                  </span>
                  {outcome === "KEEP_IN_WEEK" && <Check className="h-3.5 w-3.5 text-amber-600" />}
                </div>
                <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400 leading-tight">
                  Leave task in this week for late completion record.
                </p>
              </button>

              {/* Option 3: Cancel */}
              <button
                type="button"
                onClick={() => setOutcome("CANCEL")}
                className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                  outcome === "CANCEL"
                    ? "border-rose-500 bg-rose-50/60 text-rose-950 ring-1 ring-rose-500 dark:bg-rose-950/40 dark:text-rose-100"
                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-300"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <Ban className="h-3.5 w-3.5 text-rose-500" />
                    Cancel Task
                  </span>
                  {outcome === "CANCEL" && <Check className="h-3.5 w-3.5 text-rose-600" />}
                </div>
                <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400 leading-tight">
                  Retains historical record without rolling forward.
                </p>
              </button>

              {/* Option 4: Reassign & Carry (Admin only) */}
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setOutcome("REASSIGN")}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                    outcome === "REASSIGN"
                      ? "border-sky-500 bg-sky-50/60 text-sky-950 ring-1 ring-sky-500 dark:bg-sky-950/40 dark:text-sky-100"
                      : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-300"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                      Reassign & Carry
                    </span>
                    {outcome === "REASSIGN" && <Check className="h-3.5 w-3.5 text-sky-600" />}
                  </div>
                  <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400 leading-tight">
                    Carry forward with a new assigned owner.
                  </p>
                </button>
              ) : (
                <div className="flex flex-col items-start rounded-xl border border-dashed border-stone-200 bg-stone-50/50 p-3 text-left opacity-60 dark:border-stone-800 dark:bg-stone-950/30">
                  <span className="font-semibold text-xs text-stone-400 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" /> Reassign
                  </span>
                  <p className="mt-1 text-[11px] text-stone-400">
                    Reassignment is restricted to admins.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Educational Note on Carry Forward History */}
          {(outcome === "CARRY_FORWARD" || outcome === "REASSIGN") && (
            <div className="rounded-xl bg-amber-50/70 p-3 border border-amber-200/60 text-amber-900 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40">
              <p className="text-xs leading-relaxed font-medium">
                💡 <span className="font-bold">Historical Integrity:</span> This will create a new task for Week of {targetWeek}. The original task will remain in Week of {task.week_start} as historical evidence.
              </p>
            </div>
          )}

          {/* Reassign Target Owner (if REASSIGN) */}
          {outcome === "REASSIGN" && isAdmin && (
            <div className="space-y-1.5">
              <label htmlFor="new-owner" className="block font-semibold text-stone-700 dark:text-stone-300">
                New Assignee *
              </label>
              <select
                id="new-owner"
                value={newOwnerId}
                onChange={(e) => setNewOwnerId(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
              >
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name || member.email} ({member.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Target Week (if CARRY_FORWARD or REASSIGN) */}
          {(outcome === "CARRY_FORWARD" || outcome === "REASSIGN") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="target-week" className="block font-semibold text-stone-700 dark:text-stone-300">
                  Target Sprint Week (Monday) *
                </label>
                <input
                  id="target-week"
                  type="date"
                  value={targetWeek}
                  onChange={(e) => setTargetWeek(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="target-due-date" className="block font-semibold text-stone-700 dark:text-stone-300">
                  New Due Date (Optional)
                </label>
                <input
                  id="target-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
                />
              </div>
            </div>
          )}

          {/* New Week Goal (if CARRY_FORWARD or REASSIGN and goals available) */}
          {(outcome === "CARRY_FORWARD" || outcome === "REASSIGN") && (
            <div className="space-y-1.5">
              <label htmlFor="next-goal" className="block font-semibold text-stone-700 dark:text-stone-300">
                Link to Next Week&apos;s Company Goal (Optional)
              </label>
              <select
                id="next-goal"
                value={newGoalId}
                onChange={(e) => setNewGoalId(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
              >
                <option value="">No goal (Standalone task)</option>
                {nextWeekGoals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Rollover / Review Note */}
          <div className="space-y-1.5">
            <label htmlFor="review-note" className="block font-semibold text-stone-700 dark:text-stone-300">
              Review Note / Reason (Optional)
            </label>
            <input
              id="review-note"
              type="text"
              placeholder='e.g., "Waiting on vendor feedback", "Deferred to next sprint"'
              value={rolloverNote}
              onChange={(e) => setRolloverNote(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
            />
          </div>

          {/* Dialog Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-stone-100 pt-4 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-stone-200 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-500 text-white shadow-sm hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Recording...
                </>
              ) : (
                "Confirm Decision"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
