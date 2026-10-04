"use client";

import * as React from "react";
import {
  AlertCircle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  ListTodo,
  Plus,
  Search,
  X,
} from "lucide-react";
import { TaskWithAssignees, Profile, TaskStatus, statusDisplayMap, WeeklyGoal } from "@/types";
import { WeekNavigator } from "@/components/tasks/week-navigator";
import { KanbanColumn } from "./kanban-column";
import { BlockerPromptDialog } from "./blocker-prompt-dialog";
import { TaskDetailDialog } from "./task-detail-dialog";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { DeleteTaskDialog } from "@/components/tasks/delete-task-dialog";
import { updateTaskStatusAction } from "@/lib/tasks/actions";
import { Button } from "@/components/ui/button";

interface TeamBoardViewProps {
  initialTasks: TaskWithAssignees[];
  currentWeekStart: string;
  currentUser: Profile;
  teamMembers: Profile[];
  availableGoals?: WeeklyGoal[];
}

export function TeamBoardView({
  initialTasks,
  currentWeekStart,
  currentUser,
  teamMembers,
  availableGoals = [],
}: TeamBoardViewProps) {
  const [tasks, setTasks] = React.useState<TaskWithAssignees[]>(initialTasks);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [memberFilter, setMemberFilter] = React.useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("ALL");
  const [blockedOnly, setBlockedOnly] = React.useState<boolean>(false);

  // Mobile Active Column Tab
  const [activeMobileColumn, setActiveMobileColumn] = React.useState<TaskStatus>("IN_PROGRESS");

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<TaskWithAssignees | null>(null);
  const [viewingTask, setViewingTask] = React.useState<TaskWithAssignees | null>(null);
  const [deletingTask, setDeletingTask] = React.useState<TaskWithAssignees | null>(null);

  // Blocker prompt state
  const [blockerPromptTask, setBlockerPromptTask] = React.useState<TaskWithAssignees | null>(null);
  const [pendingBlockerTargetStatus, setPendingBlockerTargetStatus] = React.useState<TaskStatus | null>(null);

  // Error alert banner
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Sync state with server props when navigation or revalidation occurs
  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const isAdmin = currentUser.role === "ADMIN";

  // Filter tasks for display
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        !searchQuery ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (task.owner?.full_name && task.owner.full_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesMember = memberFilter === "ALL" || task.owner_id === memberFilter;
      const matchesPriority = priorityFilter === "ALL" || task.priority === priorityFilter;
      const matchesBlocked = !blockedOnly || task.is_blocked || task.status === "BLOCKED";

      return matchesSearch && matchesMember && matchesPriority && matchesBlocked;
    });
  }, [tasks, searchQuery, memberFilter, priorityFilter, blockedOnly]);

  // Group filtered tasks by status
  const columnsData: Record<TaskStatus, TaskWithAssignees[]> = React.useMemo(() => {
    const grouped: Record<TaskStatus, TaskWithAssignees[]> = {
      NOT_STARTED: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      BLOCKED: [],
      DONE: [],
    };

    filteredTasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      } else {
        grouped.NOT_STARTED.push(task);
      }
    });

    return grouped;
  }, [filteredTasks]);

  // Overall Board Stats
  const boardStats = React.useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "DONE").length;
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const inReview = tasks.filter((t) => t.status === "IN_REVIEW").length;
    const blocked = tasks.filter((t) => t.is_blocked || t.status === "BLOCKED").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, inReview, blocked, completionRate };
  }, [tasks]);

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, task: TaskWithAssignees) => {
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleMoveStatus = async (
    task: TaskWithAssignees,
    newStatus: TaskStatus,
    providedBlockerReason?: string
  ) => {
    if (task.status === newStatus && !providedBlockerReason) return;

    // Check permission
    const canEdit = isAdmin || task.owner_id === currentUser.id;
    if (!canEdit) {
      setErrorMessage("Unauthorized: You can only move the status of tasks you own.");
      return;
    }

    // If moving to BLOCKED and no blocker reason is provided, open prompt modal
    if (newStatus === "BLOCKED" && !providedBlockerReason && !task.blocker_reason) {
      setBlockerPromptTask(task);
      setPendingBlockerTargetStatus(newStatus);
      return;
    }

    // Capture original state for rollback
    const originalTasks = [...tasks];

    // Optimistic Update
    const updatedTasks = tasks.map((t) => {
      if (t.id === task.id) {
        const isBlocked = newStatus === "BLOCKED";
        let progress = t.progress;
        if (newStatus === "DONE") {
          progress = 100;
        } else if (newStatus === "NOT_STARTED") {
          progress = 0;
        }

        return {
          ...t,
          status: newStatus,
          is_blocked: isBlocked,
          blocker_reason: isBlocked
            ? providedBlockerReason || t.blocker_reason || "Blocked"
            : null,
          progress,
          updated_at: new Date().toISOString(),
        };
      }
      return t;
    });

    setTasks(updatedTasks);
    setErrorMessage(null);

    // Server Mutation
    const res = await updateTaskStatusAction(
      task.id,
      newStatus,
      providedBlockerReason || (newStatus === "BLOCKED" ? task.blocker_reason : null)
    );

    if (res.error) {
      // Rollback on error
      setTasks(originalTasks);
      setErrorMessage(res.error);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    handleMoveStatus(task, targetStatus);
  };

  const allStatuses: TaskStatus[] = [
    "NOT_STARTED",
    "IN_PROGRESS",
    "IN_REVIEW",
    "BLOCKED",
    "DONE",
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-2xl">
              Team Board
            </h1>
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
              Kanban
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 sm:text-sm">
            Shared weekly execution board. Track progress across all team commitments.
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

      {/* Week Navigator & Metrics Overview */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <WeekNavigator currentWeekMonday={currentWeekStart} />

        {/* Metric Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-xl border border-stone-200/80 bg-white px-3 py-1.5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
            <ListTodo className="h-3.5 w-3.5 text-stone-400" />
            <span className="font-semibold text-stone-900 dark:text-stone-100">{boardStats.total}</span>
            <span className="text-stone-500">Planned</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-sky-200/80 bg-sky-50/50 px-3 py-1.5 text-sky-800 shadow-xs dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300">
            <Clock className="h-3.5 w-3.5 text-sky-500" />
            <span className="font-semibold">{boardStats.inProgress}</span>
            <span>In Flight</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/50 px-3 py-1.5 text-rose-800 shadow-xs dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertOctagon className="h-3.5 w-3.5 text-rose-500" />
            <span className="font-semibold">{boardStats.blocked}</span>
            <span>Blocked</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-3 py-1.5 text-emerald-800 shadow-xs dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="font-semibold">{boardStats.completed}</span>
            <span>Done ({boardStats.completionRate}%)</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white p-3 shadow-xs dark:border-stone-800 dark:bg-stone-900 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Filter by title, owner, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-1.5 pl-8 pr-3 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-950/50 dark:text-stone-100"
          />
        </div>

        {/* Dropdown Filters & Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Member Filter */}
          <select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            className="rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-1.5 text-xs font-medium text-stone-700 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-950/50 dark:text-stone-300"
          >
            <option value="ALL">All Team Members</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name || member.email}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-1.5 text-xs font-medium text-stone-700 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-950/50 dark:text-stone-300"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Blocked Only Toggle */}
          <button
            type="button"
            onClick={() => setBlockedOnly(!blockedOnly)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
              blockedOnly
                ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-400"
                : "border-stone-200 bg-stone-50/50 text-stone-600 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-950/50 dark:text-stone-400"
            }`}
          >
            <AlertOctagon className="h-3.5 w-3.5 text-rose-500" />
            <span>Blocked Only</span>
          </button>
        </div>
      </div>

      {/* Error Message Banner */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="rounded-md p-1 hover:bg-rose-100 dark:hover:bg-rose-900/60"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Mobile Segmented Tab Navigation (< 1024px) */}
      <div className="flex lg:hidden overflow-x-auto gap-1.5 rounded-2xl border border-stone-200/80 bg-white p-1.5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
        {allStatuses.map((status) => {
          const count = columnsData[status]?.length || 0;
          const isActive = activeMobileColumn === status;

          return (
            <button
              key={status}
              type="button"
              onClick={() => setActiveMobileColumn(status)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-stone-900 text-white shadow-xs dark:bg-amber-500 dark:text-stone-950"
                  : "text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
              }`}
            >
              <span>{statusDisplayMap[status]}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  isActive
                    ? "bg-stone-700 text-stone-200 dark:bg-amber-600 dark:text-stone-950"
                    : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile Column View (< 1024px) */}
      <div className="block lg:hidden">
        <KanbanColumn
          status={activeMobileColumn}
          tasks={columnsData[activeMobileColumn]}
          currentUserId={currentUser.id}
          currentUserRole={currentUser.role}
          onEdit={(task) => setEditingTask(task)}
          onView={(task) => setViewingTask(task)}
          onMoveStatus={handleMoveStatus}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      </div>

      {/* Desktop 5-Column Kanban Board (>= 1024px) */}
      <div className="hidden lg:grid grid-cols-5 gap-4 overflow-x-auto pb-4 items-start">
        {allStatuses.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={columnsData[status]}
            currentUserId={currentUser.id}
            currentUserRole={currentUser.role}
            onEdit={(task) => setEditingTask(task)}
            onView={(task) => setViewingTask(task)}
            onMoveStatus={handleMoveStatus}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          />
        ))}
      </div>

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

      {/* Edit Task Dialog (Owner / Admin) */}
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

      {/* Read-Only Task Detail Dialog (Teammate view for members) */}
      {viewingTask && (
        <TaskDetailDialog
          isOpen={!!viewingTask}
          onClose={() => setViewingTask(null)}
          task={viewingTask}
        />
      )}

      {/* Blocker Description Prompt Dialog */}
      {blockerPromptTask && (
        <BlockerPromptDialog
          isOpen={!!blockerPromptTask}
          onClose={() => {
            setBlockerPromptTask(null);
            setPendingBlockerTargetStatus(null);
          }}
          taskTitle={blockerPromptTask.title}
          onConfirm={async (reason) => {
            if (blockerPromptTask && pendingBlockerTargetStatus) {
              await handleMoveStatus(blockerPromptTask, pendingBlockerTargetStatus, reason);
            }
          }}
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
