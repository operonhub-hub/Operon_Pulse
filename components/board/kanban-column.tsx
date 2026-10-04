"use client";

import * as React from "react";
import {
  AlertOctagon,
  CheckCircle2,
  Clock,
  ListTodo,
  Sparkles,
} from "lucide-react";
import { TaskWithAssignees, TaskStatus, statusDisplayMap } from "@/types";
import { KanbanCard } from "./kanban-card";

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: TaskWithAssignees[];
  currentUserId?: string;
  currentUserRole?: "ADMIN" | "MEMBER";
  onEdit: (task: TaskWithAssignees) => void;
  onView: (task: TaskWithAssignees) => void;
  onMoveStatus: (task: TaskWithAssignees, newStatus: TaskStatus) => void;
  onDragStart: (e: React.DragEvent, task: TaskWithAssignees) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetStatus: TaskStatus) => void;
}

export function KanbanColumn({
  status,
  tasks,
  currentUserId,
  currentUserRole,
  onEdit,
  onView,
  onMoveStatus,
  onDragStart,
  onDragOver,
  onDrop,
}: KanbanColumnProps) {
  const [isOver, setIsOver] = React.useState(false);

  const getColumnHeaderStyle = () => {
    switch (status) {
      case "NOT_STARTED":
        return {
          icon: ListTodo,
          bg: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
          pill: "bg-stone-200 text-stone-800 dark:bg-stone-700 dark:text-stone-200",
          accent: "border-t-stone-400",
        };
      case "IN_PROGRESS":
        return {
          icon: Clock,
          bg: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400",
          pill: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300",
          accent: "border-t-sky-500",
        };
      case "IN_REVIEW":
        return {
          icon: Sparkles,
          bg: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400",
          pill: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
          accent: "border-t-purple-500",
        };
      case "BLOCKED":
        return {
          icon: AlertOctagon,
          bg: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400",
          pill: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300",
          accent: "border-t-rose-500",
        };
      case "DONE":
        return {
          icon: CheckCircle2,
          bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
          pill: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
          accent: "border-t-emerald-500",
        };
    }
  };

  const headerStyle = getColumnHeaderStyle();
  const Icon = headerStyle.icon;

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
  };

  const handleDropInternal = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    onDrop(e, status);
  };

  return (
    <div
      onDragOver={(e) => {
        onDragOver(e);
        setIsOver(true);
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDropInternal}
      className={`flex flex-col rounded-2xl border bg-stone-50/70 p-3 transition-colors min-w-[270px] max-w-full flex-1 dark:bg-stone-900/40 ${
        isOver
          ? "border-amber-400 bg-amber-50/40 ring-2 ring-amber-400/30 dark:border-amber-500 dark:bg-amber-950/20"
          : "border-stone-200/80 dark:border-stone-800"
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/80">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-lg ${headerStyle.bg}`}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
            {statusDisplayMap[status]}
          </span>
        </div>

        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${headerStyle.pill}`}
        >
          {tasks.length}
        </span>
      </div>

      {/* Cards Container */}
      <div className="mt-3 flex-1 space-y-2.5 min-h-[300px]">
        {tasks.length === 0 ? (
          <div className="flex h-full min-h-[140px] items-center justify-center rounded-xl border border-dashed border-stone-200/80 p-4 text-center dark:border-stone-800/80">
            <span className="text-[11px] font-medium text-stone-400 dark:text-stone-500">
              No tasks in {statusDisplayMap[status].toLowerCase()}
            </span>
          </div>
        ) : (
          tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onEdit={onEdit}
              onView={onView}
              onMoveStatus={onMoveStatus}
              onDragStart={onDragStart}
            />
          ))
        )}
      </div>
    </div>
  );
}
