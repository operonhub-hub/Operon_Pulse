"use client";

import * as React from "react";
import {
  ArrowRightLeft,
  HelpCircle,
  ListTodo,
} from "lucide-react";
import {
  TaskWithAssignees,
  WeeklyCheckin,
  TeamMemberCheckinStatus,
  WeeklyExecutionSummary,
  Profile,
  WeeklyGoal,
} from "@/types";
import { WeekNavigator } from "@/components/tasks/week-navigator";
import { WeeklyExecutionSummaryCard } from "./weekly-execution-summary-card";
import { IncompleteTasksList } from "./incomplete-tasks-list";
import { TaskReviewDialog } from "./task-review-dialog";
import { WeeklyCheckinCard } from "./weekly-checkin-card";
import { TeamCheckinStatus } from "./team-checkin-status";

interface WeeklyReviewViewProps {
  currentWeekStart: string;
  nextWeekStart: string;
  currentUser: Profile;
  teamMembers: Profile[];
  initialIncompleteTasks: TaskWithAssignees[];
  nextWeekGoals: WeeklyGoal[];
  initialUserCheckin: WeeklyCheckin | null;
  initialTeamCheckins: TeamMemberCheckinStatus[];
  initialSummary: WeeklyExecutionSummary;
}

export function WeeklyReviewView({
  currentWeekStart,
  nextWeekStart,
  currentUser,
  teamMembers,
  initialIncompleteTasks,
  nextWeekGoals = [],
  initialUserCheckin,
  initialTeamCheckins,
  initialSummary,
}: WeeklyReviewViewProps) {
  const isAdmin = currentUser.role === "ADMIN";

  const [reviewingTask, setReviewingTask] = React.useState<TaskWithAssignees | null>(null);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-2xl">
              Weekly Review &amp; Rollover
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60">
              <ArrowRightLeft className="h-3.5 w-3.5" /> Sprint Closeout
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 sm:text-sm">
            Review unfinished workstreams, carry forward commitments, and submit your weekly check-in.
          </p>
        </div>
      </div>

      {/* Week Navigator */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <WeekNavigator currentWeekMonday={currentWeekStart} />
      </div>

      {/* Educational Guidance Banner */}
      <div className="rounded-2xl border border-stone-200/80 bg-stone-50/60 p-4 text-xs dark:border-stone-800 dark:bg-stone-900/40">
        <div className="flex items-start gap-3">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <h4 className="font-semibold text-stone-900 dark:text-stone-100">
              Cadence: Plan → Execute → Track → Review → Carry Forward → Improve
            </h4>
            <p className="text-stone-500 dark:text-stone-400 leading-relaxed">
              Unfinished tasks are never moved automatically. Carrying forward creates a new copy for next week while preserving the original record in this week as historical evidence.
            </p>
          </div>
        </div>
      </div>

      {/* 1. Deterministic Execution Summary */}
      <WeeklyExecutionSummaryCard summary={initialSummary} />

      {/* 2. Incomplete Tasks Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-amber-500" />
              <span>Incomplete Tasks for Review ({initialIncompleteTasks.length})</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Select an outcome for each unfinished item: Carry forward, cancel, or keep in week.
            </p>
          </div>
        </div>

        <IncompleteTasksList
          tasks={initialIncompleteTasks}
          currentUserId={currentUser.id}
          currentUserRole={currentUser.role}
          onReviewTask={(task) => setReviewingTask(task)}
        />
      </div>

      {/* 3. Check-ins Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User's Check-in Card (2 cols on lg) */}
        <div className={isAdmin ? "lg:col-span-2" : "lg:col-span-3"}>
          <WeeklyCheckinCard
            weekStart={currentWeekStart}
            initialCheckin={initialUserCheckin}
          />
        </div>

        {/* Team Check-in Roster (1 col on lg, Admin only) */}
        {isAdmin && (
          <div className="lg:col-span-1">
            <TeamCheckinStatus teamCheckins={initialTeamCheckins} />
          </div>
        )}
      </div>

      {/* Task Review Modal */}
      {reviewingTask && (
        <TaskReviewDialog
          isOpen={!!reviewingTask}
          onClose={() => setReviewingTask(null)}
          task={reviewingTask}
          currentWeekMonday={currentWeekStart}
          nextWeekMonday={nextWeekStart}
          currentUser={currentUser}
          teamMembers={teamMembers}
          nextWeekGoals={nextWeekGoals}
        />
      )}
    </div>
  );
}
