"use client";

import * as React from "react";
import { HeartHandshake } from "lucide-react";
import { TaskWithAssignees, reviewOutcomeDisplayMap, statusDisplayMap } from "@/types";
import { StatusBadge } from "@/components/shared/status-badge";
import { SupportingBadge } from "@/components/shared/supporting-badge";

/**
 * Read-only list of unfinished tasks the viewer supports, with the owner's
 * review outcome once recorded. Supporters can't review these tasks themselves.
 */
export function SupportingTasksReview({ tasks }: { tasks: TaskWithAssignees[] }) {
  if (tasks.length === 0) return null;

  return (
    <section aria-labelledby="supporting-review-heading" className="space-y-3">
      <div>
        <h3
          id="supporting-review-heading"
          className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2"
        >
          <HeartHandshake className="h-4 w-4 text-violet-600" aria-hidden="true" />
          <span>Tasks You Support ({tasks.length})</span>
        </h3>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
          Reviewed by each task&apos;s owner. Outcomes appear here once recorded.
        </p>
      </div>

      <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-violet-200/70 bg-white shadow-sm dark:divide-stone-800 dark:border-violet-900/60 dark:bg-stone-900">
        {tasks.map((task) => (
          <li key={task.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 text-xs">
            <SupportingBadge />
            <span className="min-w-0 flex-1 truncate font-semibold text-stone-900 dark:text-stone-100">
              {task.title}
            </span>
            <span className="text-stone-500">
              <span className="sr-only">Owner: </span>
              {task.owner?.full_name || task.owner?.email || "Unknown owner"}
            </span>
            <StatusBadge status={statusDisplayMap[task.status]} />
            {task.review_outcome ? (
              <span className="rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-800 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200">
                Outcome: {reviewOutcomeDisplayMap[task.review_outcome]}
              </span>
            ) : (
              <span className="text-[11px] text-stone-400">Not reviewed yet</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
