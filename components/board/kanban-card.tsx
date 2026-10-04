"use client";

import * as React from "react";
import {
  Calendar,
  Clock,
  GripVertical,
  Lock,
  MoreHorizontal,
  ShieldAlert,
  Target,
  Users,
} from "lucide-react";
import {
  TaskWithAssignees,
  TaskPriority,
  TaskStatus,
  priorityDisplayMap,
  statusDisplayMap,
} from "@/types";
import { Progress } from "@/components/ui/progress";
import { RolloverBadge } from "@/components/reviews/rollover-badge";

interface KanbanCardProps {
  task: TaskWithAssignees;
  currentUserId?: string;
  currentUserRole?: "ADMIN" | "MEMBER";
  onEdit: (task: TaskWithAssignees) => void;
  onView: (task: TaskWithAssignees) => void;
  onMoveStatus: (task: TaskWithAssignees, newStatus: TaskStatus) => void;
  onDragStart: (e: React.DragEvent, task: TaskWithAssignees) => void;
}

export function KanbanCard({
  task,
  currentUserId,
  currentUserRole,
  onEdit,
  onView,
  onMoveStatus,
  onDragStart,
}: KanbanCardProps) {
  const [showStatusMenu, setShowStatusMenu] = React.useState(false);

  const canEdit = currentUserRole === "ADMIN" || task.owner_id === currentUserId;
  const isBlocked = task.is_blocked || task.status === "BLOCKED";

  // Check Overdue: due_date < today's date (YYYY-MM-DD) and status != DONE
  const todayStr = new Date().toISOString().split("T")[0];
  const isOverdue = !!(task.due_date && task.due_date < todayStr && task.status !== "DONE");

  const getPriorityBadgeClass = (priority: TaskPriority) => {
    switch (priority) {
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

  const allStatuses: TaskStatus[] = [
    "NOT_STARTED",
    "IN_PROGRESS",
    "IN_REVIEW",
    "BLOCKED",
    "DONE",
  ];

  return (
    <div
      draggable={canEdit}
      onDragStart={(e) => onDragStart(e, task)}
      onClick={() => (canEdit ? onEdit(task) : onView(task))}
      className={`group relative rounded-xl border bg-white p-3.5 shadow-xs transition-all hover:shadow-md cursor-pointer dark:bg-stone-900 ${
        isBlocked
          ? "border-rose-200 bg-rose-50/20 dark:border-rose-900/60 dark:bg-rose-950/10"
          : "border-stone-200/90 dark:border-stone-800"
      } ${canEdit ? "active:scale-[0.99] cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (canEdit) onEdit(task);
          else onView(task);
        }
      }}
    >
      {/* Top Header: Priority Badge & Drag/Lock Handle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${getPriorityBadgeClass(
              task.priority
            )}`}
          >
            {priorityDisplayMap[task.priority]}
          </span>
          <RolloverBadge
            rolloverCount={task.rollover_count}
            rolloverNote={task.rollover_note}
          />
          {isOverdue && (
            <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-400">
              <Clock className="h-2.5 w-2.5" /> Overdue
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Move Status Quick Menu for Accessibility & Touch */}
          {canEdit && (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="rounded-md p-1 text-stone-400 opacity-0 group-hover:opacity-100 hover:bg-stone-100 hover:text-stone-700 transition-opacity focus:opacity-100 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                title="Change status"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>

              {showStatusMenu && (
                <div className="absolute right-0 top-6 z-30 w-36 rounded-xl border border-stone-200 bg-white p-1 shadow-lg dark:border-stone-800 dark:bg-stone-900">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase text-stone-400">
                    Move to:
                  </div>
                  {allStatuses
                    .filter((s) => s !== task.status)
                    .map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setShowStatusMenu(false);
                          onMoveStatus(task, s);
                        }}
                        className="w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                      >
                        {statusDisplayMap[s]}
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {canEdit ? (
            <div className="text-stone-300 group-hover:text-stone-500 dark:text-stone-700 dark:group-hover:text-stone-400">
              <GripVertical className="h-3.5 w-3.5" />
            </div>
          ) : (
            <div className="text-stone-400" title="Read-only teammate task">
              <Lock className="h-3 w-3" />
            </div>
          )}
        </div>
      </div>

      {/* Task Title */}
      <h4 className="mt-2 text-xs font-semibold leading-snug text-stone-900 dark:text-stone-100 line-clamp-2">
        {task.title}
      </h4>

      {/* Linked Goal Badge */}
      {task.goal && (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400">
          <Target className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate font-medium">{task.goal.title}</span>
        </div>
      )}

      {/* Blocker Alert */}
      {isBlocked && task.blocker_reason && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-rose-50/90 p-2 text-[11px] text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50">
          <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
          <p className="line-clamp-2 font-normal leading-tight">
            <span className="font-semibold">Blocker: </span>
            {task.blocker_reason}
          </p>
        </div>
      )}

      {/* Progress */}
      <div className="mt-2.5 space-y-1">
        <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-400">
          <span>Progress</span>
          <span className="font-semibold">{task.progress}%</span>
        </div>
        <Progress value={task.progress} className="h-1.5" />
      </div>

      {/* Footer: Owner, Support, Due Date */}
      <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-2 text-[11px] text-stone-500 dark:border-stone-800 dark:text-stone-400">
        <div className="flex items-center gap-1.5 max-w-[130px] truncate">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            {task.owner?.full_name ? task.owner.full_name.charAt(0).toUpperCase() : "U"}
          </div>
          <span className="truncate font-medium text-stone-700 dark:text-stone-300">
            {task.owner?.full_name || task.owner?.email?.split("@")[0] || "Unassigned"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {task.support_person && (
            <span
              className="flex items-center gap-0.5 text-[10px] text-stone-400"
              title={`Support: ${task.support_person.full_name || task.support_person.email}`}
            >
              <Users className="h-3 w-3" />
            </span>
          )}

          {task.due_date && (
            <span
              className={`flex items-center gap-1 text-[10px] ${
                isOverdue ? "font-bold text-rose-600 dark:text-rose-400" : "text-stone-400"
              }`}
            >
              <Calendar className="h-2.5 w-2.5" />
              {task.due_date.slice(5)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
