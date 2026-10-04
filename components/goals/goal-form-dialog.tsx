"use client";

import * as React from "react";
import { AlertCircle, Loader2, Target, X } from "lucide-react";
import { WeeklyGoal, Profile, GoalStatus } from "@/types";
import { createGoalAction, updateGoalAction, GoalFormPayload } from "@/lib/goals/actions";
import { Button } from "@/components/ui/button";

interface GoalFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  goal?: WeeklyGoal | null;
  currentWeekMonday: string;
  teamMembers: Profile[];
  onSuccess?: () => void;
}

export function GoalFormDialog({
  isOpen,
  onClose,
  goal,
  currentWeekMonday,
  teamMembers,
  onSuccess,
}: GoalFormDialogProps) {
  const isEditing = !!goal;

  // Default target date is the Sunday of the active week
  const defaultSunday = React.useMemo(() => {
    const monday = new Date((goal?.week_start || currentWeekMonday) + "T00:00:00");
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return sunday.toISOString().split("T")[0];
  }, [goal, currentWeekMonday]);

  const [title, setTitle] = React.useState(goal?.title || "");
  const [description, setDescription] = React.useState(goal?.description || "");
  const [status, setStatus] = React.useState<GoalStatus>(goal?.status || "ON_TRACK");
  const [ownerId, setOwnerId] = React.useState(goal?.owner_id || "");
  const [targetDate, setTargetDate] = React.useState(goal?.target_date || defaultSunday);
  const [weekStart, setWeekStart] = React.useState(goal?.week_start || currentWeekMonday);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset or initialize state when opening
  React.useEffect(() => {
    if (isOpen) {
      setTitle(goal?.title || "");
      setDescription(goal?.description || "");
      setStatus(goal?.status || "ON_TRACK");
      setOwnerId(goal?.owner_id || "");
      setTargetDate(goal?.target_date || defaultSunday);
      setWeekStart(goal?.week_start || currentWeekMonday);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, goal, currentWeekMonday, defaultSunday]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Goal title is required.");
      return;
    }
    if (trimmedTitle.length > 255) {
      setError("Goal title must be 255 characters or fewer.");
      return;
    }

    setIsSubmitting(true);

    const payload: GoalFormPayload = {
      title: trimmedTitle,
      description: description.trim() || null,
      status,
      owner_id: ownerId || null,
      target_date: targetDate || null,
      week_start: weekStart,
    };

    try {
      let res;
      if (isEditing && goal) {
        res = await updateGoalAction(goal.id, payload);
      } else {
        res = await createGoalAction(payload);
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
      setError(err instanceof Error ? err.message : "Failed to save weekly goal.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="goal-form-title"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-800 dark:bg-stone-900 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h3
                id="goal-form-title"
                className="text-lg font-bold text-stone-900 dark:text-stone-100"
              >
                {isEditing ? "Edit Weekly Goal" : "Create Weekly Company Goal"}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Define key team outcomes for the active sprint cycle.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Title */}
          <div>
            <label
              htmlFor="goal-title"
              className="block font-semibold text-stone-700 dark:text-stone-300"
            >
              Goal Title <span className="text-amber-600">*</span>
            </label>
            <input
              id="goal-title"
              type="text"
              required
              maxLength={255}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Ship Core Onboarding Redesign & Reduce Dropoff"
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="goal-description"
              className="block font-semibold text-stone-700 dark:text-stone-300"
            >
              Description & Success Metric (Optional)
            </label>
            <textarea
              id="goal-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key deliverable details, target metrics, or customer impact..."
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100"
            />
          </div>

          {/* Grid: Status & Owner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label
                htmlFor="goal-status"
                className="block font-semibold text-stone-700 dark:text-stone-300"
              >
                Goal Status
              </label>
              <select
                id="goal-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as GoalStatus)}
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-200"
              >
                <option value="ON_TRACK">On Track</option>
                <option value="AT_RISK">At Risk</option>
                <option value="OFF_TRACK">Off Track</option>
                <option value="ACHIEVED">Achieved</option>
              </select>
            </div>

            {/* Owner */}
            <div>
              <label
                htmlFor="goal-owner"
                className="block font-semibold text-stone-700 dark:text-stone-300"
              >
                Goal Lead (Optional)
              </label>
              <select
                id="goal-owner"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-200"
              >
                <option value="">Unassigned (Team Goal)</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name || member.email} ({member.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid: Target Date & Execution Week */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target Date */}
            <div>
              <label
                htmlFor="goal-target-date"
                className="block font-semibold text-stone-700 dark:text-stone-300"
              >
                Target Delivery Date
              </label>
              <input
                id="goal-target-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-200"
              />
            </div>

            {/* Week Start */}
            <div>
              <label
                htmlFor="goal-week-start"
                className="block font-semibold text-stone-700 dark:text-stone-300"
              >
                Execution Week (Monday)
              </label>
              <input
                id="goal-week-start"
                type="date"
                disabled
                value={weekStart}
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-100 px-3 py-2 text-xs font-medium text-stone-500 cursor-not-allowed dark:border-stone-800 dark:bg-stone-800 dark:text-stone-400"
              />
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-stone-100 pt-4 dark:border-stone-800">
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
              className="bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500 dark:bg-amber-500 dark:hover:bg-amber-600"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Saving..." : isEditing ? "Save Goal Changes" : "Create Goal"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
