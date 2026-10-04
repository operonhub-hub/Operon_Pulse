"use client";

import * as React from "react";
import {
  AlertOctagon,
  CheckCircle2,
  Clock,
  Info,
  Plus,
  Target,
} from "lucide-react";
import { GoalWithTaskSummary, Profile, TaskWithAssignees } from "@/types";
import { WeekNavigator } from "@/components/tasks/week-navigator";
import { GoalCard } from "./goal-card";
import { GoalFormDialog } from "./goal-form-dialog";
import { GoalDetailDialog } from "./goal-detail-dialog";
import { DeleteGoalDialog } from "./delete-goal-dialog";
import { Button } from "@/components/ui/button";
import { calculateOverallGoalProgress } from "@/lib/goals/logic";

interface GoalsViewProps {
  initialGoals: GoalWithTaskSummary[];
  allWeekTasks: TaskWithAssignees[];
  currentWeekStart: string;
  currentUser: Profile;
  teamMembers: Profile[];
}

export function GoalsView({
  initialGoals,
  currentWeekStart,
  currentUser,
  teamMembers,
}: GoalsViewProps) {
  const [goals, setGoals] = React.useState<GoalWithTaskSummary[]>(initialGoals);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingGoal, setEditingGoal] = React.useState<GoalWithTaskSummary | null>(null);
  const [viewingGoal, setViewingGoal] = React.useState<GoalWithTaskSummary | null>(null);
  const [deletingGoal, setDeletingGoal] = React.useState<GoalWithTaskSummary | null>(null);

  React.useEffect(() => {
    setGoals(initialGoals);
  }, [initialGoals]);

  const isAdmin = currentUser.role === "ADMIN";

  // Metrics calculation
  const totalGoals = goals.length;
  const achievedGoals = goals.filter((g) => g.status === "ACHIEVED").length;
  const onTrackGoals = goals.filter((g) => g.status === "ON_TRACK").length;
  const atRiskOrOffTrackGoals = goals.filter(
    (g) => g.status === "AT_RISK" || g.status === "OFF_TRACK"
  ).length;
  const overallProgress = calculateOverallGoalProgress(goals);

  return (
    <div className="space-y-6 pb-16">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-2xl">
              Weekly Goals
            </h1>
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
              Outcomes
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 sm:text-sm">
            Core deliverables and strategic milestones committed for this execution cycle.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isAdmin && (
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-amber-500 text-white shadow-sm hover:bg-amber-600 focus:ring-amber-500 dark:bg-amber-500 dark:hover:bg-amber-600"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Goal
            </Button>
          )}
        </div>
      </div>

      {/* Week Navigator & Guidance */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <WeekNavigator currentWeekMonday={currentWeekStart} />

        {/* Guidance note for focus */}
        <div className="flex items-center gap-2 rounded-xl border border-stone-200/80 bg-stone-50/70 px-3.5 py-2 text-xs text-stone-600 dark:border-stone-800 dark:bg-stone-900/40 dark:text-stone-400">
          <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong className="font-semibold text-stone-800 dark:text-stone-200">Execution Rule:</strong> Aim for 3–5 high-impact weekly goals to keep team focus sharp.
          </span>
        </div>
      </div>

      {/* Weekly Goal Progress Overview Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Goals */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
            <span>Weekly Goals</span>
            <Target className="h-4 w-4 text-stone-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {totalGoals}
            </span>
            <span className="text-xs text-stone-400">outcomes</span>
          </div>
        </div>

        {/* On Track */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between text-xs text-teal-600 dark:text-teal-400">
            <span>On Track</span>
            <Clock className="h-4 w-4 text-teal-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {onTrackGoals}
            </span>
            <span className="text-xs text-stone-400">progressing</span>
          </div>
        </div>

        {/* At Risk / Off Track */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400">
            <span>Needs Attention</span>
            <AlertOctagon className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {atRiskOrOffTrackGoals}
            </span>
            <span className="text-xs text-stone-400">at risk</span>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
            <span>Average Progress</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {overallProgress !== null ? `${overallProgress}%` : "—"}
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {achievedGoals} achieved
            </span>
          </div>
        </div>
      </div>

      {/* Goals Grid / Empty State */}
      {goals.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-white/50 p-8 text-center backdrop-blur-sm dark:border-stone-800 dark:bg-stone-900/40">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            <Target className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-stone-900 dark:text-stone-100">
            {isAdmin ? "Set this week's priorities" : "No weekly goals have been set yet."}
          </h3>
          <p className="mt-1.5 max-w-md text-sm text-stone-500 dark:text-stone-400">
            {isAdmin
              ? "Define 3–5 strategic outcomes the team committed to deliver this week and link supporting tasks to track progress."
              : "Company goals will appear here once published by workspace administrators."}
          </p>
          {isAdmin && (
            <div className="mt-6">
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="bg-amber-500 text-white shadow-sm hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Create First Goal
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              isAdmin={isAdmin}
              onSelect={(g) => setViewingGoal(g)}
              onEdit={(g) => setEditingGoal(g)}
              onDelete={(g) => setDeletingGoal(g)}
            />
          ))}
        </div>
      )}

      {/* Create Goal Dialog (ADMIN only) */}
      {isAdmin && isCreateOpen && (
        <GoalFormDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          currentWeekMonday={currentWeekStart}
          teamMembers={teamMembers}
        />
      )}

      {/* Edit Goal Dialog (ADMIN only) */}
      {isAdmin && editingGoal && (
        <GoalFormDialog
          isOpen={!!editingGoal}
          onClose={() => setEditingGoal(null)}
          goal={editingGoal}
          currentWeekMonday={editingGoal.week_start || currentWeekStart}
          teamMembers={teamMembers}
        />
      )}

      {/* View Goal Detail Dialog (All authenticated users) */}
      {viewingGoal && (
        <GoalDetailDialog
          isOpen={!!viewingGoal}
          onClose={() => setViewingGoal(null)}
          goal={viewingGoal}
          isAdmin={isAdmin}
          onEdit={(g) => {
            setViewingGoal(null);
            setEditingGoal(g);
          }}
          onDelete={(g) => {
            setViewingGoal(null);
            setDeletingGoal(g);
          }}
        />
      )}

      {/* Delete Goal Dialog (ADMIN only) */}
      {isAdmin && deletingGoal && (
        <DeleteGoalDialog
          isOpen={!!deletingGoal}
          onClose={() => setDeletingGoal(null)}
          goal={deletingGoal}
        />
      )}
    </div>
  );
}
