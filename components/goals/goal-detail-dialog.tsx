"use client";

import * as React from "react";
import {
  AlertOctagon,
  Calendar,
  Edit2,
  ListTodo,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { GoalWithTaskSummary, statusDisplayMap } from "@/types";
import { GoalStatusBadge } from "./goal-status-badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface GoalDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  goal: GoalWithTaskSummary | null;
  isAdmin: boolean;
  onEdit?: (goal: GoalWithTaskSummary) => void;
  onDelete?: (goal: GoalWithTaskSummary) => void;
}

export function GoalDetailDialog({
  isOpen,
  onClose,
  goal,
  isAdmin,
  onEdit,
  onDelete,
}: GoalDetailDialogProps) {
  if (!isOpen || !goal) return null;

  const linkedTasks = goal.linkedTasks || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="goal-detail-title"
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-800 dark:bg-stone-900 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4 dark:border-stone-800">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <GoalStatusBadge status={goal.status} />
                {goal.isReadyForAchieved && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <Sparkles className="h-3 w-3" /> All tasks completed
                  </span>
                )}
              </div>
              <h3
                id="goal-detail-title"
                className="text-lg font-bold text-stone-900 dark:text-stone-100"
              >
                {goal.title}
              </h3>
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

        {/* Body */}
        <div className="mt-4 space-y-5 text-xs">
          {/* Risk Alert */}
          {goal.riskSignals.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
              <div className="flex items-center gap-2 font-semibold">
                <AlertOctagon className="h-4 w-4 text-rose-600" />
                <span>Execution Risk Detected</span>
              </div>
              <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs">
                {goal.riskSignals.map((signal, idx) => (
                  <li key={idx}>{signal}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Description */}
          {goal.description && (
            <div>
              <h4 className="font-semibold text-stone-800 dark:text-stone-200 mb-1">
                Description & Success Criteria
              </h4>
              <p className="whitespace-pre-wrap leading-relaxed text-stone-600 dark:text-stone-400 bg-stone-50/50 p-3.5 rounded-xl border border-stone-100 dark:border-stone-800 dark:bg-stone-950/30">
                {goal.description}
              </p>
            </div>
          )}

          {/* Derived Progress */}
          <div className="space-y-1.5 rounded-xl bg-stone-50 p-4 dark:bg-stone-800/40">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-800 dark:text-stone-200">
              <span>Goal Progress (Derived from {goal.totalTasks} linked tasks)</span>
              <span>{goal.calculatedProgress}%</span>
            </div>
            <Progress value={goal.calculatedProgress} className="h-2.5" />
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-y border-stone-100 py-3 dark:border-stone-800">
            <div>
              <span className="text-[11px] font-medium text-stone-400">Goal Lead</span>
              <div className="mt-1 flex items-center gap-1.5 font-medium text-stone-800 dark:text-stone-200">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                  {goal.owner?.full_name ? goal.owner.full_name.charAt(0).toUpperCase() : "T"}
                </div>
                <span>{goal.owner?.full_name || "Team-wide Goal"}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-medium text-stone-400">Target Date</span>
              <div className="mt-1 flex items-center gap-1.5 font-medium text-stone-800 dark:text-stone-200">
                <Calendar className="h-3.5 w-3.5 text-stone-400" />
                <span>{goal.target_date || "End of week"}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-medium text-stone-400">Week Cycle</span>
              <div className="mt-1 font-medium text-stone-800 dark:text-stone-200">
                <span>Week of {goal.week_start}</span>
              </div>
            </div>
          </div>

          {/* Linked Supporting Tasks Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <ListTodo className="h-4 w-4 text-stone-400" />
                <span>Supporting Tasks ({linkedTasks.length})</span>
              </h4>
              <span className="text-[11px] text-stone-400">
                {goal.completedTasks} completed · {goal.blockedTasks} blocked
              </span>
            </div>

            {linkedTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center text-stone-400 dark:border-stone-800">
                <p>No tasks currently linked to this goal.</p>
                <p className="mt-1 text-[11px]">
                  Team members can attach weekly tasks to this goal via the task form.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {linkedTasks.map((task) => {
                  const isTaskBlocked = task.is_blocked || task.status === "BLOCKED";

                  return (
                    <div
                      key={task.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-stone-200/80 bg-white p-3 shadow-xs dark:border-stone-800 dark:bg-stone-950/40"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                            {task.title}
                          </span>
                          {isTaskBlocked && (
                            <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-400 shrink-0">
                              Blocked
                            </span>
                          )}
                        </div>
                        {isTaskBlocked && task.blocker_reason && (
                          <p className="text-[11px] text-rose-600 dark:text-rose-400">
                            Blocker: {task.blocker_reason}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        <span className="text-[11px] font-medium text-stone-500">
                          {task.owner?.full_name || "Unassigned"}
                        </span>
                        <span className="font-semibold text-stone-700 dark:text-stone-300">
                          {task.progress}%
                        </span>
                        <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                          {statusDisplayMap[task.status]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4 dark:border-stone-800">
          <div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                {onEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onEdit(goal);
                    }}
                    className="gap-1.5 text-xs text-stone-700 dark:text-stone-300"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit Goal
                  </Button>
                )}
                {onDelete && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onDelete(goal);
                    }}
                    className="gap-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-stone-200 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
