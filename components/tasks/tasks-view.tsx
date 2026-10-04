"use client";

import * as React from "react";
import {
  AlertOctagon,
  CheckCircle2,
  Clock,
  ListTodo,
  Plus,
  UserCheck,
  Users,
} from "lucide-react";
import { TaskWithAssignees, Profile, WeeklyGoal } from "@/types";
import { WeekNavigator } from "@/components/tasks/week-navigator";
import { TaskTable } from "@/components/tasks/task-table";
import { EmptyTasksView } from "@/components/tasks/empty-tasks-view";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { DeleteTaskDialog } from "@/components/tasks/delete-task-dialog";
import { Button } from "@/components/ui/button";

interface TasksViewProps {
  initialTasks: TaskWithAssignees[];
  currentWeekStart: string;
  currentUser: Profile;
  teamMembers: Profile[];
  availableGoals?: WeeklyGoal[];
}

export function TasksView({
  initialTasks,
  currentWeekStart,
  currentUser,
  teamMembers,
  availableGoals = [],
}: TasksViewProps) {
  const [tasks, setTasks] = React.useState<TaskWithAssignees[]>(initialTasks);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<TaskWithAssignees | null>(null);
  const [deletingTask, setDeletingTask] = React.useState<TaskWithAssignees | null>(null);
  const [adminScope, setAdminScope] = React.useState<"ALL" | "MINE">("ALL");

  // Keep state synced with server props when navigation or revalidation occurs
  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const isAdmin = currentUser.role === "ADMIN";

  // Filter tasks based on adminScope (if admin) or member (always mine)
  const displayedTasks = React.useMemo(() => {
    if (!isAdmin || adminScope === "MINE") {
      return tasks.filter((t) => t.owner_id === currentUser.id);
    }
    return tasks;
  }, [tasks, isAdmin, adminScope, currentUser.id]);

  // Weekly Execution Metrics
  const stats = React.useMemo(() => {
    const total = displayedTasks.length;
    const completed = displayedTasks.filter((t) => t.status === "DONE").length;
    const inProgress = displayedTasks.filter(
      (t) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW"
    ).length;
    const blocked = displayedTasks.filter((t) => t.is_blocked || t.status === "BLOCKED").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, blocked, completionRate };
  }, [displayedTasks]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-2xl">
            Weekly Tasks
          </h1>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 sm:text-sm">
            Plan and execute weekly sprint commitments. Stay aligned and unblock fast.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-amber-500 text-white shadow-sm hover:bg-amber-600 focus:ring-amber-500 dark:bg-amber-500 dark:hover:bg-amber-600"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Week Navigator & Scope Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <WeekNavigator currentWeekMonday={currentWeekStart} />

        {isAdmin && (
          <div className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white p-1 shadow-sm dark:border-stone-800 dark:bg-stone-900 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setAdminScope("ALL")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                adminScope === "ALL"
                  ? "bg-stone-900 text-white dark:bg-amber-500 dark:text-stone-950"
                  : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              All Team Tasks ({tasks.length})
            </button>
            <button
              type="button"
              onClick={() => setAdminScope("MINE")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                adminScope === "MINE"
                  ? "bg-stone-900 text-white dark:bg-amber-500 dark:text-stone-950"
                  : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              My Tasks ({tasks.filter((t) => t.owner_id === currentUser.id).length})
            </button>
          </div>
        )}
      </div>

      {/* Weekly Progress Overview Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Planned */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
            <span>Planned</span>
            <ListTodo className="h-4 w-4 text-stone-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {stats.total}
            </span>
            <span className="text-xs text-stone-400">tasks</span>
          </div>
        </div>

        {/* In Progress */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between text-xs text-sky-600 dark:text-sky-400">
            <span>In Flight</span>
            <Clock className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {stats.inProgress}
            </span>
            <span className="text-xs text-stone-400">active</span>
          </div>
        </div>

        {/* Completed */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
            <span>Completed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {stats.completed}
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {stats.completionRate}%
            </span>
          </div>
        </div>

        {/* Blocked */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400">
            <span>Blocked</span>
            <AlertOctagon className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {stats.blocked}
            </span>
            <span className="text-xs text-stone-400">need help</span>
          </div>
        </div>
      </div>

      {/* Main Tasks List View */}
      {displayedTasks.length === 0 ? (
        <EmptyTasksView
          onAddTask={() => setIsCreateOpen(true)}
          isFiltered={tasks.length > 0 && displayedTasks.length === 0}
        />
      ) : (
        <TaskTable
          tasks={displayedTasks}
          currentUserId={currentUser.id}
          currentUserRole={currentUser.role}
          onEditTask={(task) => setEditingTask(task)}
          onDeleteTask={(task) => setDeletingTask(task)}
        />
      )}

      {/* Create Task Dialog */}
      {isCreateOpen && (
        <TaskFormDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          currentWeekMonday={currentWeekStart}
          currentUser={currentUser}
          teamMembers={teamMembers}
          availableGoals={availableGoals}
        />
      )}

      {/* Edit Task Dialog */}
      {editingTask && (
        <TaskFormDialog
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          task={editingTask}
          currentWeekMonday={editingTask.week_start || currentWeekStart}
          currentUser={currentUser}
          teamMembers={teamMembers}
          availableGoals={availableGoals}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteTaskDialog
        isOpen={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        task={deletingTask}
      />
    </div>
  );
}
