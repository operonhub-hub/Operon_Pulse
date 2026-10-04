"use client";

import * as React from "react";
import {
  Calendar,
  Edit2,
  ListTodo,
  MoreVertical,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { GoalWithTaskSummary } from "@/types";
import { GoalStatusBadge } from "./goal-status-badge";
import { Progress } from "@/components/ui/progress";

interface GoalCardProps {
  goal: GoalWithTaskSummary;
  isAdmin: boolean;
  onSelect: (goal: GoalWithTaskSummary) => void;
  onEdit?: (goal: GoalWithTaskSummary) => void;
  onDelete?: (goal: GoalWithTaskSummary) => void;
}

export function GoalCard({
  goal,
  isAdmin,
  onSelect,
  onEdit,
  onDelete,
}: GoalCardProps) {
  const [showMenu, setShowMenu] = React.useState(false);

  // Close menu on outside click
  React.useEffect(() => {
    const handleClick = () => setShowMenu(false);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];
  const isOverdue = !!(
    goal.target_date &&
    goal.target_date < todayStr &&
    goal.status !== "ACHIEVED" &&
    goal.calculatedProgress < 100
  );

  return (
    <div
      onClick={() => onSelect(goal)}
      className="group relative rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs transition-all hover:border-amber-400 hover:shadow-md cursor-pointer dark:border-stone-800 dark:bg-stone-900"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(goal);
        }
      }}
    >
      {/* Top Bar: Icon, Title, Status, Admin Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100/70 text-amber-800 dark:bg-amber-950/70 dark:text-amber-400">
            <Target className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <GoalStatusBadge status={goal.status} />
              {goal.isReadyForAchieved && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <Sparkles className="h-3 w-3" /> Ready to achieve
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-stone-900 group-hover:text-amber-600 transition-colors dark:text-stone-100 dark:group-hover:text-amber-400 line-clamp-2">
              {goal.title}
            </h3>
          </div>
        </div>

        {/* Admin Menu */}
        {isAdmin && (
          <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-lg p-1 text-stone-400 opacity-0 group-hover:opacity-100 hover:bg-stone-100 hover:text-stone-700 transition-opacity focus:opacity-100 dark:hover:bg-stone-800 dark:hover:text-stone-200"
              title="Goal Options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-6 z-30 w-32 rounded-xl border border-stone-200 bg-white p-1 shadow-lg dark:border-stone-800 dark:bg-stone-900">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onEdit(goal);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(goal);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      {goal.description && (
        <p className="mt-2.5 text-xs text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed">
          {goal.description}
        </p>
      )}

      {/* Derived Progress Bar */}
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-stone-500 dark:text-stone-400">Derived Progress</span>
          <span className="font-bold text-stone-900 dark:text-stone-100">
            {goal.calculatedProgress}%
          </span>
        </div>
        <Progress
          value={goal.calculatedProgress}
          className="h-2"
          indicatorClassName={
            goal.status === "ACHIEVED"
              ? "bg-emerald-500"
              : goal.status === "OFF_TRACK"
              ? "bg-rose-500"
              : goal.status === "AT_RISK"
              ? "bg-amber-500"
              : "bg-teal-500"
          }
        />
      </div>

      {/* Task Summary Breakdown */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400 border-t border-stone-100 pt-3 dark:border-stone-800">
        <div className="flex items-center gap-1 font-medium text-stone-700 dark:text-stone-300">
          <ListTodo className="h-3.5 w-3.5 text-stone-400" />
          <span>{goal.totalTasks} tasks linked</span>
        </div>
        <span>·</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
          {goal.completedTasks} done
        </span>
        {goal.inProgressTasks > 0 && (
          <>
            <span>·</span>
            <span className="text-sky-600 dark:text-sky-400">
              {goal.inProgressTasks} active
            </span>
          </>
        )}
        {goal.blockedTasks > 0 && (
          <>
            <span>·</span>
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              {goal.blockedTasks} blocked
            </span>
          </>
        )}
      </div>

      {/* Risk Signals & Target Date Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            {goal.owner?.full_name ? goal.owner.full_name.charAt(0).toUpperCase() : "T"}
          </div>
          <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300">
            {goal.owner?.full_name || "Team Goal"}
          </span>
        </div>

        {goal.target_date && (
          <div
            className={`flex items-center gap-1 text-[11px] ${
              isOverdue ? "font-bold text-rose-600 dark:text-rose-400" : "text-stone-400"
            }`}
          >
            <Calendar className="h-3 w-3" />
            <span>Due {goal.target_date.slice(5)}</span>
          </div>
        )}
      </div>

      {/* Risk Alert Pill */}
      {goal.riskSignals.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-rose-50/80 px-2.5 py-1 text-[11px] font-medium text-rose-700 border border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50">
          <ShieldAlert className="h-3 w-3 shrink-0 text-rose-500" />
          <span className="truncate">{goal.riskSignals.join(" · ")}</span>
        </div>
      )}
    </div>
  );
}
