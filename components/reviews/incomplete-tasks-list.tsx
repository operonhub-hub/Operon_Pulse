"use client";

import * as React from "react";
import {
  AlertCircle,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Target,
} from "lucide-react";
import {
  TaskWithAssignees,
  statusDisplayMap,
  reviewOutcomeDisplayMap,
} from "@/types";
import { RolloverBadge } from "./rollover-badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface IncompleteTasksListProps {
  tasks: TaskWithAssignees[];
  currentUserId: string;
  currentUserRole: "ADMIN" | "MEMBER";
  onReviewTask: (task: TaskWithAssignees) => void;
}

export function IncompleteTasksList({
  tasks,
  currentUserId,
  currentUserRole,
  onReviewTask,
}: IncompleteTasksListProps) {
  const isAdmin = currentUserRole === "ADMIN";

  const canReviewTask = (task: TaskWithAssignees) => {
    if (isAdmin) return true;
    return task.owner_id === currentUserId;
  };

  if (tasks.length === 0) {
    return (
      <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-white/40 p-8 text-center dark:border-stone-800 dark:bg-stone-900/30">
        <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
        <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          All tasks completed!
        </h4>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          No unfinished tasks require review for this weekly cycle.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-stone-200 bg-stone-50/70 text-stone-500 dark:border-stone-800 dark:bg-stone-950/40 dark:text-stone-400">
            <tr>
              <th scope="col" className="px-5 py-3.5 font-medium">Task</th>
              <th scope="col" className="px-4 py-3.5 font-medium">Assignee</th>
              <th scope="col" className="px-4 py-3.5 font-medium">Status</th>
              <th scope="col" className="px-4 py-3.5 font-medium">Progress</th>
              <th scope="col" className="px-4 py-3.5 font-medium">Review Status</th>
              <th scope="col" className="px-4 py-3.5 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
            {tasks.map((task) => {
              const isBlocked = task.is_blocked || task.status === "BLOCKED";
              const canReview = canReviewTask(task);
              const hasReview = !!task.review_outcome;

              return (
                <tr
                  key={task.id}
                  className="group transition-colors hover:bg-stone-50/60 dark:hover:bg-stone-800/30"
                >
                  {/* Task Info */}
                  <td className="px-5 py-3.5 align-top">
                    <div className="max-w-md space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-stone-900 dark:text-stone-100">
                          {task.title}
                        </span>
                        <RolloverBadge
                          rolloverCount={task.rollover_count}
                          rolloverNote={task.rollover_note}
                        />
                        {isBlocked && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                            <AlertCircle className="h-3 w-3" /> Blocked
                          </span>
                        )}
                      </div>
                      {task.goal && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                          <Target className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{task.goal.title}</span>
                        </div>
                      )}
                      {isBlocked && task.blocker_reason && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400">
                          Blocker: {task.blocker_reason}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Assignee */}
                  <td className="px-4 py-3.5 align-top">
                    <div className="flex items-center gap-1.5 font-medium text-stone-800 dark:text-stone-200">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                        {task.owner?.full_name ? task.owner.full_name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <span>{task.owner?.full_name || task.owner?.email || "Unassigned"}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5 align-top">
                    <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                      {statusDisplayMap[task.status]}
                    </span>
                  </td>

                  {/* Progress */}
                  <td className="px-4 py-3.5 align-top min-w-[100px]">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                        {task.progress}%
                      </span>
                      <Progress value={task.progress} className="h-1.5" />
                    </div>
                  </td>

                  {/* Review Outcome Decision */}
                  <td className="px-4 py-3.5 align-top">
                    {hasReview ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900">
                        <CheckCircle2 className="h-3 w-3" />
                        {reviewOutcomeDisplayMap[task.review_outcome!]}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-stone-400">
                        <Clock className="h-3 w-3" /> Pending Review
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 align-top text-right">
                    {canReview ? (
                      <Button
                        type="button"
                        size="sm"
                        variant={hasReview ? "outline" : "default"}
                        onClick={() => onReviewTask(task)}
                        className={`h-7 px-2.5 text-xs font-medium gap-1 ${
                          hasReview
                            ? "border-stone-200 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300"
                            : "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600"
                        }`}
                      >
                        <ArrowRightLeft className="h-3 w-3" />
                        <span>{hasReview ? "Update Review" : "Review"}</span>
                      </Button>
                    ) : (
                      <span className="text-[11px] text-stone-400 italic">View Only</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="grid gap-3 md:hidden">
        {tasks.map((task) => {
          const isBlocked = task.is_blocked || task.status === "BLOCKED";
          const canReview = canReviewTask(task);
          const hasReview = !!task.review_outcome;

          return (
            <div
              key={task.id}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <RolloverBadge
                      rolloverCount={task.rollover_count}
                      rolloverNote={task.rollover_note}
                    />
                    {isBlocked && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                        Blocked
                      </span>
                    )}
                    <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                      {statusDisplayMap[task.status]}
                    </span>
                  </div>
                  <h4 className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                    {task.title}
                  </h4>
                </div>

                {hasReview && (
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60 shrink-0">
                    {reviewOutcomeDisplayMap[task.review_outcome!]}
                  </span>
                )}
              </div>

              {task.goal && (
                <div className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400">
                  <Target className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{task.goal.title}</span>
                </div>
              )}

              {isBlocked && task.blocker_reason && (
                <div className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-100 dark:border-rose-900">
                  <span className="font-medium">Blocker: </span>
                  {task.blocker_reason}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span>Progress</span>
                  <span>{task.progress}%</span>
                </div>
                <Progress value={task.progress} className="h-1.5" />
              </div>

              <div className="flex items-center justify-between border-t border-stone-100 pt-2.5 text-xs text-stone-500 dark:border-stone-800">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                    {task.owner?.full_name ? task.owner.full_name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <span className="text-[11px]">{task.owner?.full_name || task.owner?.email}</span>
                </div>

                {canReview && (
                  <Button
                    type="button"
                    size="sm"
                    variant={hasReview ? "outline" : "default"}
                    onClick={() => onReviewTask(task)}
                    className="h-7 px-3 text-xs"
                  >
                    {hasReview ? "Update Review" : "Review"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
