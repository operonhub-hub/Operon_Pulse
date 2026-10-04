import { WeeklyGoal, GoalWithTaskSummary, TaskWithAssignees, DbTask } from "@/types";

/**
 * Calculates the average progress of a set of linked tasks (0 to 100%).
 * Returns 0 if no tasks are linked.
 */
export function calculateGoalProgress(tasks: (TaskWithAssignees | DbTask)[]): number {
  if (!tasks || tasks.length === 0) {
    return 0;
  }
  const sum = tasks.reduce((acc, t) => acc + (Number(t.progress) || 0), 0);
  return Math.min(Math.max(Math.round(sum / tasks.length), 0), 100);
}

/**
 * Computes task completion counts, derived progress, and deterministic risk signals for a goal.
 */
export function getGoalTaskSummary(
  goal: WeeklyGoal,
  allWeekTasks: TaskWithAssignees[]
): GoalWithTaskSummary {
  const linkedTasks = allWeekTasks.filter((t) => t.goal_id === goal.id);

  const totalTasks = linkedTasks.length;
  const completedTasks = linkedTasks.filter((t) => t.status === "DONE").length;
  const inProgressTasks = linkedTasks.filter((t) => t.status === "IN_PROGRESS").length;
  const inReviewTasks = linkedTasks.filter((t) => t.status === "IN_REVIEW").length;
  const blockedTasks = linkedTasks.filter((t) => t.is_blocked || t.status === "BLOCKED").length;

  const calculatedProgress = calculateGoalProgress(linkedTasks);

  const todayStr = new Date().toISOString().split("T")[0];
  const overdueTasks = linkedTasks.filter(
    (t) => t.due_date && t.due_date < todayStr && t.status !== "DONE"
  ).length;

  const riskSignals: string[] = [];

  if (blockedTasks > 0) {
    riskSignals.push(`${blockedTasks} active blocker${blockedTasks > 1 ? "s" : ""}`);
  }

  if (overdueTasks > 0) {
    riskSignals.push(`${overdueTasks} overdue task${overdueTasks > 1 ? "s" : ""}`);
  }

  if (
    goal.target_date &&
    goal.target_date < todayStr &&
    goal.status !== "ACHIEVED" &&
    calculatedProgress < 100
  ) {
    riskSignals.push("Target date passed");
  }

  const isReadyForAchieved =
    totalTasks > 0 && completedTasks === totalTasks && goal.status !== "ACHIEVED";

  return {
    ...goal,
    totalTasks,
    completedTasks,
    inProgressTasks,
    inReviewTasks,
    blockedTasks,
    calculatedProgress,
    riskSignals,
    isReadyForAchieved,
    linkedTasks,
  };
}

/**
 * Returns overall average goal progress across active week goals.
 * Returns null if no goals are present.
 */
export function calculateOverallGoalProgress(
  summaries: GoalWithTaskSummary[]
): number | null {
  if (!summaries || summaries.length === 0) {
    return null;
  }
  const sum = summaries.reduce((acc, g) => acc + g.calculatedProgress, 0);
  return Math.round(sum / summaries.length);
}
