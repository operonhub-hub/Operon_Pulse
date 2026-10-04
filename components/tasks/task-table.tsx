"use client";

import * as React from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Edit2,
  Search,
  ShieldAlert,
  Target,
  Trash2,
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
import { Button } from "@/components/ui/button";
import { RolloverBadge } from "@/components/reviews/rollover-badge";

interface TaskTableProps {
  tasks: TaskWithAssignees[];
  currentUserId?: string;
  currentUserRole?: "ADMIN" | "MEMBER";
  onEditTask: (task: TaskWithAssignees) => void;
  onDeleteTask: (task: TaskWithAssignees) => void;
}

export function TaskTable({
  tasks,
  currentUserId,
  currentUserRole,
  onEditTask,
  onDeleteTask,
}: TaskTableProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("ALL");

  // Filter tasks
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        !searchQuery ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (task.owner?.full_name && task.owner.full_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === "ALL" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "ALL" || task.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter]);

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

  const getStatusBadgeClass = (status: TaskStatus) => {
    switch (status) {
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

  const canManageTask = (task: TaskWithAssignees) => {
    if (currentUserRole === "ADMIN") return true;
    return task.owner_id === currentUserId;
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search tasks or assignees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-4 text-xs text-stone-800 placeholder-stone-400 transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
          >
            <option value="ALL">All Statuses</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="DONE">Done</option>
            <option value="BLOCKED">Blocked</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-white/40 p-8 text-center dark:border-stone-800 dark:bg-stone-900/30">
          <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
            No tasks match your current filter.
          </p>
          <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
            Try adjusting your search terms or filters above.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-stone-200 bg-stone-50/70 text-stone-500 dark:border-stone-800 dark:bg-stone-950/40 dark:text-stone-400">
                <tr>
                  <th scope="col" className="px-5 py-3.5 font-medium">Task</th>
                  <th scope="col" className="px-4 py-3.5 font-medium">Assignee</th>
                  <th scope="col" className="px-4 py-3.5 font-medium">Priority</th>
                  <th scope="col" className="px-4 py-3.5 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3.5 font-medium">Progress</th>
                  <th scope="col" className="px-4 py-3.5 font-medium">Due</th>
                  <th scope="col" className="px-4 py-3.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                {filteredTasks.map((task) => {
                  const isBlocked = task.is_blocked || task.status === "BLOCKED";
                  const canEdit = canManageTask(task);

                  return (
                    <tr
                      key={task.id}
                      className="group transition-colors hover:bg-stone-50/60 dark:hover:bg-stone-800/30"
                    >
                      {/* Task Info */}
                      <td className="px-5 py-4 align-top">
                        <div className="max-w-md space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-stone-900 dark:text-stone-100">
                              {task.title}
                            </span>
                            <RolloverBadge
                              rolloverCount={task.rollover_count}
                              rolloverNote={task.rollover_note}
                            />
                            {task.goal && (
                              <span
                                className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40"
                                title={`Linked Goal: ${task.goal.title}`}
                              >
                                <Target className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                                <span className="max-w-[140px] truncate">{task.goal.title}</span>
                              </span>
                            )}
                            {isBlocked && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                                <AlertCircle className="h-3 w-3" /> Blocked
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="line-clamp-2 text-xs text-stone-500 dark:text-stone-400">
                              {task.description}
                            </p>
                          )}
                          {isBlocked && task.blocker_reason && (
                            <div className="mt-1 flex items-start gap-1.5 rounded-lg bg-rose-50/80 p-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60">
                              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <div>
                                <span className="font-medium">Blocker: </span>
                                {task.blocker_reason}
                              </div>
                            </div>
                          )}
                          {task.acceptance_criteria && (
                            <div className="text-[11px] text-stone-400 dark:text-stone-500">
                              <span className="font-medium text-stone-500 dark:text-stone-400">Criteria: </span>
                              {task.acceptance_criteria}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Assignee & Support */}
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-medium text-stone-800 dark:text-stone-200">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                              {task.owner?.full_name ? task.owner.full_name.charAt(0).toUpperCase() : "U"}
                            </div>
                            <span>{task.owner?.full_name || task.owner?.email || "Unassigned"}</span>
                          </div>
                          {task.support_person && (
                            <div className="flex items-center gap-1 text-[11px] text-stone-400 dark:text-stone-500">
                              <Users className="h-3 w-3" />
                              <span>Support: {task.support_person.full_name || task.support_person.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-medium ${getPriorityBadgeClass(
                            task.priority
                          )}`}
                        >
                          {priorityDisplayMap[task.priority]}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-medium ${getStatusBadgeClass(
                            task.status
                          )}`}
                        >
                          {statusDisplayMap[task.status]}
                        </span>
                      </td>

                      {/* Progress */}
                      <td className="px-4 py-4 align-top min-w-[120px]">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                            <span>{task.progress}%</span>
                            {task.status === "DONE" && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            )}
                          </div>
                          <Progress value={task.progress} className="h-1.5" />
                        </div>
                      </td>

                      {/* Due Date */}
                      <td className="px-4 py-4 align-top whitespace-nowrap text-stone-600 dark:text-stone-400">
                        {task.due_date ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-stone-400" />
                            <span>{task.due_date}</span>
                          </div>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 align-top text-right">
                        {canEdit ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditTask(task)}
                              className="h-7 w-7 p-0 text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                              title="Edit Task"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteTask(task)}
                              className="h-7 w-7 p-0 text-stone-500 hover:bg-rose-50 hover:text-rose-600 dark:text-stone-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                              title="Delete Task"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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

          {/* Mobile Card View */}
          <div className="grid gap-3 md:hidden">
            {filteredTasks.map((task) => {
              const isBlocked = task.is_blocked || task.status === "BLOCKED";
              const canEdit = canManageTask(task);

              return (
                <div
                  key={task.id}
                  className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${getPriorityBadgeClass(
                            task.priority
                          )}`}
                        >
                          {priorityDisplayMap[task.priority]}
                        </span>
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${getStatusBadgeClass(
                            task.status
                          )}`}
                        >
                          {statusDisplayMap[task.status]}
                        </span>
                        <RolloverBadge
                          rolloverCount={task.rollover_count}
                          rolloverNote={task.rollover_note}
                        />
                        {task.goal && (
                          <span
                            className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40"
                            title={`Linked Goal: ${task.goal.title}`}
                          >
                            <Target className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                            <span className="max-w-[120px] truncate">{task.goal.title}</span>
                          </span>
                        )}
                        {isBlocked && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                            Blocked
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-stone-900 dark:text-stone-100">
                        {task.title}
                      </h4>
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditTask(task)}
                          className="h-8 w-8 p-0 text-stone-500"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteTask(task)}
                          className="h-8 w-8 p-0 text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {task.description && (
                    <p className="mt-2 text-xs text-stone-500 dark:text-stone-400 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  {isBlocked && task.blocker_reason && (
                    <div className="mt-2.5 rounded-lg bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-100 dark:border-rose-900">
                      <span className="font-medium">Blocker: </span>
                      {task.blocker_reason}
                    </div>
                  )}

                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span>Progress</span>
                      <span>{task.progress}%</span>
                    </div>
                    <Progress value={task.progress} className="h-1.5" />
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-2.5 text-xs text-stone-500 dark:border-stone-800">
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                        {task.owner?.full_name ? task.owner.full_name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <span>{task.owner?.full_name || task.owner?.email || "Unassigned"}</span>
                    </div>
                    {task.due_date && (
                      <div className="flex items-center gap-1 text-[11px]">
                        <Calendar className="h-3 w-3 text-stone-400" />
                        <span>{task.due_date}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
