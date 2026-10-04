import {
  TaskWithAssignees,
  GoalWithTaskSummary,
  WeeklyCheckin,
  TaskWeeklyReview,
  WeeklyExecutionSummary,
} from "@/types";

/**
 * Calculates deterministic weekly execution summary metrics and formats a concise paragraph.
 */
export function calculateWeeklyExecutionSummary(
  tasks: TaskWithAssignees[],
  goals: GoalWithTaskSummary[],
  checkins: WeeklyCheckin[],
  reviews: TaskWeeklyReview[],
  totalTeamMembersCount: number,
  weekStart: string
): WeeklyExecutionSummary {
  const totalTasksPlanned = tasks.length;
  const tasksCompleted = tasks.filter((t) => t.status === "DONE").length;
  const inProgressTasksCount = tasks.filter(
    (t) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW"
  ).length;
  const blockedTasksCount = tasks.filter((t) => t.is_blocked || t.status === "BLOCKED").length;
  const criticalBlockedCount = tasks.filter(
    (t) => (t.is_blocked || t.status === "BLOCKED") && t.priority === "CRITICAL"
  ).length;
  const incompleteTasksCount = totalTasksPlanned - tasksCompleted;

  const completionRate =
    totalTasksPlanned > 0 ? Math.round((tasksCompleted / totalTasksPlanned) * 100) : 0;

  const totalGoalsCommitted = goals.length;
  const goalsAchievedCount = goals.filter((g) => g.status === "ACHIEVED").length;
  const goalsAtRiskCount = goals.filter(
    (g) => g.status === "AT_RISK" || g.status === "OFF_TRACK" || g.riskSignals.length > 0
  ).length;

  const averageGoalProgress =
    totalGoalsCommitted > 0
      ? Math.round(goals.reduce((acc, g) => acc + g.calculatedProgress, 0) / totalGoalsCommitted)
      : null;

  const totalCarryovers = reviews.filter((r) => r.outcome === "CARRY_FORWARD" || r.outcome === "REASSIGN").length;
  const repeatedCarryovers = tasks.filter((t) => (t.rollover_count ?? 0) >= 2).length;

  const checkinsSubmittedCount = checkins.length;

  // Generate deterministic templated summary text (no AI/LLM)
  let summaryParagraph = "";
  if (totalTasksPlanned === 0 && totalGoalsCommitted === 0) {
    summaryParagraph = `No tasks or company goals were planned for the week starting ${weekStart}.`;
  } else {
    const taskPart = `${tasksCompleted} of ${totalTasksPlanned} tasks were completed (${completionRate}%).`;
    const blockerPart =
      blockedTasksCount > 0
        ? ` ${blockedTasksCount} task${blockedTasksCount > 1 ? "s" : ""} remained blocked.`
        : " No tasks remained blocked.";
    const rolloverPart =
      totalCarryovers > 0
        ? ` ${totalCarryovers} task${totalCarryovers > 1 ? "s were" : " was"} carried forward to next week.`
        : "";
    const goalPart =
      totalGoalsCommitted > 0
        ? ` ${goalsAchievedCount} of ${totalGoalsCommitted} weekly goals were achieved.`
        : "";

    summaryParagraph = `${taskPart}${blockerPart}${rolloverPart}${goalPart}`;
  }

  return {
    weekStart,
    totalTasksPlanned,
    tasksCompleted,
    completionRate,
    incompleteTasksCount,
    inProgressTasksCount,
    blockedTasksCount,
    criticalBlockedCount,
    totalGoalsCommitted,
    goalsAchievedCount,
    goalsAtRiskCount,
    averageGoalProgress,
    totalCarryovers,
    repeatedCarryovers,
    checkinsSubmittedCount,
    totalTeamMembersCount,
    summaryParagraph,
  };
}

/**
 * Returns true if a task is eligible for rollover (NOT_STARTED, IN_PROGRESS, IN_REVIEW, BLOCKED).
 * Completed tasks (DONE) are not eligible.
 */
export function isTaskEligibleForRollover(task: TaskWithAssignees): boolean {
  return task.status !== "DONE";
}

/**
 * Helper to check if task lineage has repeated carryovers (>= 2).
 */
export function isRepeatedCarryover(task: TaskWithAssignees): boolean {
  return (task.rollover_count ?? 0) >= 2;
}
