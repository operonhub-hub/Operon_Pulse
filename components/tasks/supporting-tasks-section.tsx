"use client";

import * as React from "react";
import { Calendar, HeartHandshake } from "lucide-react";
import { TaskWithAssignees, priorityDisplayMap, statusDisplayMap } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { SupportingBadge, initialsFor } from "@/components/shared/supporting-badge";
import { SubtaskCounter } from "@/components/tasks/subtask-counter";

/**
 * Read-only list of tasks the viewer supports. Selecting a row opens the task
 * detail view, where the supporter can tick subtasks but not edit the task.
 */
export function SupportingTasksSection({
  tasks,
  onOpenTask,
}: {
  tasks: TaskWithAssignees[];
  onOpenTask: (task: TaskWithAssignees) => void;
}) {
  const completed = tasks.filter((t) => t.status === "DONE").length;

  return (
    <section aria-labelledby="supporting-heading" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="supporting-heading"
          className="flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100"
        >
          <HeartHandshake className="h-4 w-4 text-violet-600" aria-hidden="true" />
          Supporting
          <span className="text-xs font-normal text-stone-500">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"} · {completed} completed
          </span>
        </h2>
        <p className="text-[11px] text-stone-500">
          Owned by teammates. You can view them and tick subtasks.
        </p>
      </div>

      {tasks.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-200 bg-white px-4 py-6 text-center text-xs text-stone-500 dark:border-stone-800 dark:bg-stone-900">
          You aren&apos;t supporting any tasks this week.
        </p>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-violet-200/70 bg-white shadow-sm dark:divide-stone-800 dark:border-violet-900/60 dark:bg-stone-900">
          {tasks.map((task) => {
            const ownerName = task.owner?.full_name || task.owner?.email || "Unknown owner";
            return (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => onOpenTask(task)}
                  className="flex w-full flex-col gap-2 px-4 py-3 text-left text-xs transition-colors hover:bg-violet-50/40 focus:outline-none focus-visible:bg-violet-50/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400 sm:flex-row sm:items-center sm:gap-4 dark:hover:bg-violet-950/20"
                  aria-label={`Open "${task.title}", owned by ${ownerName}`}
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <SupportingBadge />
                      <PriorityBadge priority={priorityDisplayMap[task.priority]} />
                      <StatusBadge status={statusDisplayMap[task.status]} />
                    </div>
                    <p className="truncate font-semibold text-stone-900 dark:text-stone-100">{task.title}</p>
                  </div>

                  <div className="flex items-center gap-2 sm:w-44">
                    <Avatar
                      src={task.owner?.avatar_url || undefined}
                      fallback={initialsFor(task.owner?.full_name, task.owner?.email)}
                      alt={ownerName}
                      size="sm"
                    />
                    <span className="min-w-0 truncate text-stone-600 dark:text-stone-300">
                      <span className="sr-only">Owner: </span>
                      {ownerName}
                    </span>
                  </div>

                  <div className="space-y-1 sm:w-36">
                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span className="flex items-center gap-2">
                        {task.progress}%
                        <SubtaskCounter subtasks={task.subtasks} />
                      </span>
                      {task.due_date && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" aria-hidden="true" />
                          {task.due_date}
                        </span>
                      )}
                    </div>
                    <Progress value={task.progress} className="h-1.5" />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
