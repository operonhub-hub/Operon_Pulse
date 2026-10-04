"use client";

import * as React from "react";
import { AlertOctagon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BlockerPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  onConfirm: (reason: string) => Promise<void>;
}

export function BlockerPromptDialog({
  isOpen,
  onClose,
  taskTitle,
  onConfirm,
}: BlockerPromptDialogProps) {
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setReason("");
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Please describe what is blocking this task.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onConfirm(trimmed);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to set blocker reason.");
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="blocker-prompt-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-800 dark:bg-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
            <AlertOctagon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3
              id="blocker-prompt-title"
              className="text-lg font-semibold text-stone-900 dark:text-stone-100"
            >
              What is blocking this task?
            </h3>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 line-clamp-2">
              Task: <span className="font-medium text-stone-800 dark:text-stone-200">{taskTitle}</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="blocker-reason-input"
              className="block text-xs font-semibold text-stone-700 dark:text-stone-300"
            >
              Blocker Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="blocker-reason-input"
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Waiting on API specification from external vendor, waiting on staging database credentials..."
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50/50 p-3 text-xs text-stone-900 placeholder-stone-400 transition-colors focus:border-rose-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-stone-800 dark:bg-stone-950/50 dark:text-stone-100"
              autoFocus
            />
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 p-2.5 text-xs font-medium text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
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
              type="submit"
              disabled={loading}
              className="bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 dark:bg-rose-700 dark:hover:bg-rose-800"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Marking Blocked..." : "Mark as Blocked"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
