"use client";

import * as React from "react";
import {
  AlertOctagon,
  Calendar,
  Lock,
  Target,
  Users,
  X,
} from "lucide-react";
import { TaskWithAssignees, priorityDisplayMap, statusDisplayMap } from "@/types";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface TaskDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskWithAssignees | null;
}

export function TaskDetailDialog({
  isOpen,
  onClose,
  task,
}: TaskDetailDialogProps) {
  if (!isOpen || !task) return null;

  const isBlocked = task.is_blocked || task.status === "BLOCKED";

  const getPriorityBadgeClass = () => {
    switch (task.priority) {
      case "CRITICAL":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900";
      case "HIGH":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900";
      case "MEDIUM":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900";
      case "LOW":
        return "bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700";
    }
  };

  const getStatusBadgeClass = () => {
    switch (task.status) {
      case "DONE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900";
      case "IN_PROGRESS":
        return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900";
      case "IN_REVIEW":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900";
      case "BLOCKED":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900";
      case "NOT_STARTED":
      default:
        return "bg-stone-100 text-stone-600 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-detail-title"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-800 dark:bg-stone-900 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4 dark:border-stone-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className={`rounded-md border px-2.5 py-0.5 text-xs font-semibold ${getPriorityBadgeClass()}`}
              >
                {priorityDisplayMap[task.priority]}
              </span>
              <span
                className={`rounded-md border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass()}`}
              >
                {statusDisplayMap[task.status]}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-400 dark:text-stone-500">
                <Lock className="h-3 w-3" /> Read-Only View
              </span>
            </div>
            <h3
              id="task-detail-title"
              className="text-lg font-bold text-stone-900 dark:text-stone-100"
            >
              {task.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4 text-xs">
          {/* Blocker Alert if active */}
          {isBlocked && task.blocker_reason && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
              <div className="flex items-center gap-2 font-semibold">
                <AlertOctagon className="h-4 w-4 text-rose-600" />
                <span>Active Blocker</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed">{task.blocker_reason}</p>
            </div>
          )}

          {/* Progress */}
          <div className="space-y-1.5 rounded-xl bg-stone-50 p-3 dark:bg-stone-800/50">
            <div className="flex items-center justify-between font-medium text-stone-700 dark:text-stone-300">
              <span>Execution Progress</span>
              <span>{task.progress}%</span>
            </div>
            <Progress value={task.progress} className="h-2" />
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <h4 className="font-semibold text-stone-800 dark:text-stone-200 mb-1">
                Description
              </h4>
              <p className="whitespace-pre-wrap leading-relaxed text-stone-600 dark:text-stone-400 bg-stone-50/40 p-3 rounded-xl border border-stone-100 dark:border-stone-800 dark:bg-stone-950/30">
                {task.description}
              </p>
            </div>
          )}

          {/* Acceptance Criteria */}
          {task.acceptance_criteria && (
            <div>
              <h4 className="font-semibold text-stone-800 dark:text-stone-200 mb-1">
                Acceptance Criteria
              </h4>
              <p className="whitespace-pre-wrap leading-relaxed text-stone-600 dark:text-stone-400 bg-stone-50/40 p-3 rounded-xl border border-stone-100 dark:border-stone-800 dark:bg-stone-950/30">
                {task.acceptance_criteria}
              </p>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
            <div>
              <span className="text-[11px] font-medium text-stone-400">Assigned Owner</span>
              <div className="mt-1 flex items-center gap-1.5 font-medium text-stone-800 dark:text-stone-200">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                  {task.owner?.full_name ? task.owner.full_name.charAt(0).toUpperCase() : "U"}
                </div>
                <span>{task.owner?.full_name || task.owner?.email || "Unassigned"}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-medium text-stone-400">Due Date</span>
              <div className="mt-1 flex items-center gap-1.5 font-medium text-stone-800 dark:text-stone-200">
                <Calendar className="h-3.5 w-3.5 text-stone-400" />
                <span>{task.due_date || "No due date set"}</span>
              </div>
            </div>

            {task.support_person && (
              <div>
                <span className="text-[11px] font-medium text-stone-400">Support Teammate</span>
                <div className="mt-1 flex items-center gap-1.5 font-medium text-stone-800 dark:text-stone-200">
                  <Users className="h-3.5 w-3.5 text-stone-400" />
                  <span>{task.support_person.full_name || task.support_person.email}</span>
                </div>
              </div>
            )}

            {task.goal && (
              <div>
                <span className="text-[11px] font-medium text-stone-400">Linked Company Goal</span>
                <div className="mt-1 flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-400">
                  <Target className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="truncate">{task.goal.title}</span>
                </div>
              </div>
            )}

            <div>
              <span className="text-[11px] font-medium text-stone-400">Execution Week</span>
              <div className="mt-1 font-medium text-stone-800 dark:text-stone-200">
                <span>Week starting {task.week_start}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-stone-100 pt-4 dark:border-stone-800">
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
