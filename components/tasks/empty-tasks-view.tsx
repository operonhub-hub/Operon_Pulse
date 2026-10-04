"use client";

import * as React from "react";
import { CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyTasksViewProps {
  onAddTask: () => void;
  isFiltered?: boolean;
}

export function EmptyTasksView({ onAddTask, isFiltered }: EmptyTasksViewProps) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-white/50 p-8 text-center backdrop-blur-sm dark:border-stone-800 dark:bg-stone-900/40">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-stone-900 dark:text-stone-100">
        {isFiltered ? "No tasks found for this view" : "No tasks scheduled for this week"}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-stone-500 dark:text-stone-400">
        {isFiltered
          ? "Try switching views or clearing filters to see other weekly items."
          : "Plan your commitments, prioritize your weekly focus, and keep the team aligned on execution."}
      </p>
      <div className="mt-6">
        <Button
          onClick={onAddTask}
          className="bg-amber-500 text-white shadow-sm hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Weekly Task
        </Button>
      </div>
    </div>
  );
}
