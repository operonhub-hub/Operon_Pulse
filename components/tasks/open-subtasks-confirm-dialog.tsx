"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Warns before marking a task Done while some of its subtasks are still open. */
export function OpenSubtasksConfirmDialog({
  isOpen,
  taskTitle,
  openCount,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  taskTitle: string;
  openCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    confirmRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-zinc-950/40" onClick={onCancel} aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="open-subtasks-title"
        aria-describedby="open-subtasks-desc"
        className="relative w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div className="space-y-1">
            <h2 id="open-subtasks-title" className="text-sm font-semibold text-zinc-900">
              Mark as Done with open subtasks?
            </h2>
            <p id="open-subtasks-desc" className="text-xs text-zinc-600">
              &ldquo;{taskTitle}&rdquo; still has {openCount} open {openCount === 1 ? "subtask" : "subtasks"}. The task
              will show 100% while the checklist stays as it is.
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" className="text-xs" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            className="bg-zinc-900 text-white hover:bg-zinc-800 text-xs"
            onClick={onConfirm}
          >
            Mark as Done
          </Button>
        </div>
      </div>
    </div>
  );
}
