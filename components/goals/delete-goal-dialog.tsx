"use client";

import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { WeeklyGoal } from "@/types";
import { deleteGoalAction } from "@/lib/goals/actions";
import { Button } from "@/components/ui/button";

interface DeleteGoalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  goal: WeeklyGoal | null;
  onDeleted?: () => void;
}

export function DeleteGoalDialog({
  isOpen,
  onClose,
  goal,
  onDeleted,
}: DeleteGoalDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen || !goal) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await deleteGoalAction(goal.id);
      if (res.error) {
        setError(res.error);
        setLoading(false);
      } else {
        setLoading(false);
        if (onDeleted) onDeleted();
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete weekly goal.");
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-goal-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-800 dark:bg-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3
              id="delete-goal-title"
              className="text-lg font-semibold text-stone-900 dark:text-stone-100"
            >
              Delete Weekly Goal
            </h3>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                &ldquo;{goal.title}&rdquo;
              </span>
              ?
            </p>
            <p className="mt-2 text-xs text-stone-400 dark:text-stone-500">
              Linked tasks will remain in your team board and personal task lists, but will no longer be attached to this goal.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="border-stone-200 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 dark:bg-rose-700 dark:hover:bg-rose-800"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Deleting..." : "Delete Goal"}
          </Button>
        </div>
      </div>
    </div>
  );
}
