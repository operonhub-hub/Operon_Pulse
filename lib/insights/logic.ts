import {
  DbTask,
  WeeklyGoal,
  TaskWeeklyReview,
  Profile,
} from "@/types";
import {
  WeeklyTaskMetric,
  WeeklyGoalMetric,
  WeeklyCarryoverMetric,
  WeeklyBlockerMetric,
  RecurringBlockerItem,
  WorkloadMetric,
  InsightSignal,
  InsightsOverviewStats,
  WeekOverWeekComparison,
} from "./types";
import { formatWeekLabelFromMonday } from "@/lib/utils/date";

/**
 * Calculates percentage completion rate (0-100) or returns null if no planned items.
 */
export function calculateCompletionRate(completed: number, planned: number): number | null {
  if (planned <= 0) return null;
  return Math.round((completed / planned) * 100);
}

/**
 * Calculates carryover rate as percentage of incomplete tasks carried out.
 */
export function calculateCarryoverRate(carryoversOut: number, incomplete: number): number | null {
  if (incomplete <= 0) return null;
  return Math.round((carryoversOut / incomplete) * 100);
}

/**
 * Determines whether a task is overdue relative to historical or current execution timeframe.
 */
export function isTaskOverdue(
  task: DbTask,
  currentMonday: string,
  todayStr: string = new Date().toISOString().split("T")[0]
): boolean {
  if (task.status === "DONE" || !task.due_date) {
    return false;
  }

  // If task belongs to a previous historical week, compare with Sunday end of that week
  if (task.week_start < currentMonday) {
    const monday = new Date(task.week_start + "T00:00:00");
    monday.setDate(monday.getDate() + 6);
    const endOfWeekStr = monday.toISOString().split("T")[0];
    return task.due_date < endOfWeekStr;
  }

  // For current or future week, compare against current reference date (today)
  return task.due_date < todayStr;
}

/**
 * Builds weekly task commitment and execution metrics.
 */
export function buildWeeklyTaskMetrics(
  tasks: DbTask[],
  weeks: string[],
  currentMonday: string
): WeeklyTaskMetric[] {
  const taskMap = new Map<string, DbTask[]>();
  weeks.forEach((w) => taskMap.set(w, []));

  tasks.forEach((task) => {
    if (taskMap.has(task.week_start)) {
      taskMap.get(task.week_start)!.push(task);
    }
  });

  return weeks.map((weekStart) => {
    const weekTasks = taskMap.get(weekStart) || [];
    const plannedTasks = weekTasks.length;
    const completedTasks = weekTasks.filter((t) => t.status === "DONE").length;
    const completionRate = calculateCompletionRate(completedTasks, plannedTasks);
    const incompleteTasks = plannedTasks - completedTasks;

    const notStartedCount = weekTasks.filter((t) => t.status === "NOT_STARTED").length;
    const inProgressCount = weekTasks.filter((t) => t.status === "IN_PROGRESS").length;
    const inReviewCount = weekTasks.filter((t) => t.status === "IN_REVIEW").length;
    const blockedCount = weekTasks.filter((t) => t.status === "BLOCKED" || t.is_blocked).length;
    const criticalBlockedCount = weekTasks.filter(
      (t) => (t.status === "BLOCKED" || t.is_blocked) && t.priority === "CRITICAL"
    ).length;

    const overdueCount = weekTasks.filter((t) => isTaskOverdue(t, currentMonday)).length;

    return {
      weekStart,
      formattedWeek: formatWeekLabelFromMonday(weekStart),
      plannedTasks,
      completedTasks,
      completionRate,
      incompleteTasks,
      notStartedCount,
      inProgressCount,
      inReviewCount,
      blockedCount,
      criticalBlockedCount,
      overdueCount,
    };
  });
}

/**
 * Builds weekly goal commitment and derived progress metrics.
 */
export function buildWeeklyGoalMetrics(
  goals: WeeklyGoal[],
  tasks: DbTask[],
  weeks: string[]
): WeeklyGoalMetric[] {
  const goalMap = new Map<string, WeeklyGoal[]>();
  const taskGoalMap = new Map<string, DbTask[]>();

  weeks.forEach((w) => goalMap.set(w, []));
  goals.forEach((g) => {
    if (goalMap.has(g.week_start)) {
      goalMap.get(g.week_start)!.push(g);
    }
  });

  tasks.forEach((t) => {
    if (t.goal_id) {
      if (!taskGoalMap.has(t.goal_id)) taskGoalMap.set(t.goal_id, []);
      taskGoalMap.get(t.goal_id)!.push(t);
    }
  });

  return weeks.map((weekStart) => {
    const weekGoals = goalMap.get(weekStart) || [];
    const goalsCommitted = weekGoals.length;
    const goalsAchieved = weekGoals.filter((g) => g.status === "ACHIEVED").length;
    const goalsAtRisk = weekGoals.filter((g) => g.status === "AT_RISK").length;
    const goalsOffTrack = weekGoals.filter((g) => g.status === "OFF_TRACK").length;
    const achievementRate =
      goalsCommitted > 0 ? Math.round((goalsAchieved / goalsCommitted) * 100) : null;

    let averageGoalProgress: number | null = null;
    if (goalsCommitted > 0) {
      const progressSum = weekGoals.reduce((sum, g) => {
        const linkedTasks = taskGoalMap.get(g.id) || [];
        if (linkedTasks.length > 0) {
          const avgTaskProg =
            linkedTasks.reduce((tSum, t) => tSum + (t.progress || 0), 0) / linkedTasks.length;
          return sum + avgTaskProg;
        }
        if (g.status === "ACHIEVED") return sum + 100;
        if (g.status === "ON_TRACK") return sum + 75;
        if (g.status === "AT_RISK") return sum + 40;
        return sum + 15;
      }, 0);
      averageGoalProgress = Math.round(progressSum / goalsCommitted);
    }

    return {
      weekStart,
      formattedWeek: formatWeekLabelFromMonday(weekStart),
      goalsCommitted,
      goalsAchieved,
      goalsAtRisk,
      goalsOffTrack,
      achievementRate,
      averageGoalProgress,
    };
  });
}

/**
 * Builds carryover and rollover metrics across historical weeks.
 */
export function buildWeeklyCarryoverMetrics(
  tasks: DbTask[],
  reviews: TaskWeeklyReview[],
  weeks: string[]
): WeeklyCarryoverMetric[] {
  const taskById = new Map<string, DbTask>();
  tasks.forEach((t) => taskById.set(t.id, t));

  const reviewMap = new Map<string, TaskWeeklyReview[]>();
  weeks.forEach((w) => reviewMap.set(w, []));
  reviews.forEach((r) => {
    if (reviewMap.has(r.week_start)) {
      reviewMap.get(r.week_start)!.push(r);
    }
  });

  const taskMap = new Map<string, DbTask[]>();
  weeks.forEach((w) => taskMap.set(w, []));
  tasks.forEach((t) => {
    if (taskMap.has(t.week_start)) {
      taskMap.get(t.week_start)!.push(t);
    }
  });

  return weeks.map((weekStart) => {
    const weekTasks = taskMap.get(weekStart) || [];
    const incompleteTasks = weekTasks.filter((t) => t.status !== "DONE").length;
    const weekReviews = reviewMap.get(weekStart) || [];

    const carryoverReviews = weekReviews.filter(
      (r) => r.outcome === "CARRY_FORWARD" || r.outcome === "REASSIGN"
    );
    const carryoversOut = carryoverReviews.length;
    const carryoverRate = calculateCarryoverRate(carryoversOut, incompleteTasks);

    // Repeated carryover: source task had rollover_count >= 1 (so next will be >= 2)
    // or target carried task in tasks has carried_from_task_id = r.task_id and rollover_count >= 2
    const repeatedCarryovers = carryoverReviews.filter((r) => {
      const sourceTask = taskById.get(r.task_id);
      if (sourceTask && (sourceTask.rollover_count || 0) >= 1) return true;
      const targetCarried = tasks.find(
        (t) => t.carried_from_task_id === r.task_id && (t.rollover_count || 0) >= 2
      );
      return Boolean(targetCarried);
    }).length;

    return {
      weekStart,
      formattedWeek: formatWeekLabelFromMonday(weekStart),
      incompleteTasks,
      carryoversOut,
      carryoverRate,
      repeatedCarryovers,
    };
  });
}

/**
 * Builds weekly blocker count metrics and groups exact recurring blocker texts.
 */
export function buildWeeklyBlockerMetrics(
  tasks: DbTask[],
  weeks: string[]
): {
  weeklyBlockers: WeeklyBlockerMetric[];
  recurringBlockers: RecurringBlockerItem[];
} {
  const taskMap = new Map<string, DbTask[]>();
  weeks.forEach((w) => taskMap.set(w, []));
  tasks.forEach((t) => {
    if (taskMap.has(t.week_start)) {
      taskMap.get(t.week_start)!.push(t);
    }
  });

  const weeklyBlockers: WeeklyBlockerMetric[] = weeks.map((weekStart) => {
    const weekTasks = taskMap.get(weekStart) || [];
    const blockedTasks = weekTasks.filter((t) => t.status === "BLOCKED" || t.is_blocked).length;
    const criticalBlockers = weekTasks.filter(
      (t) => (t.status === "BLOCKED" || t.is_blocked) && t.priority === "CRITICAL"
    ).length;

    return {
      weekStart,
      formattedWeek: formatWeekLabelFromMonday(weekStart),
      blockedTasks,
      criticalBlockers,
    };
  });

  // Group recurring blocker descriptions
  const blockerCounts = new Map<string, { count: number; latestWeek: string; originalText: string }>();

  tasks.forEach((t) => {
    if ((t.status === "BLOCKED" || t.is_blocked) && t.blocker_reason) {
      const cleanReason = t.blocker_reason.trim();
      if (cleanReason.length > 0) {
        const normalizedKey = cleanReason.toLowerCase();
        const existing = blockerCounts.get(normalizedKey);
        if (existing) {
          existing.count += 1;
          if (t.week_start > existing.latestWeek) {
            existing.latestWeek = t.week_start;
          }
        } else {
          blockerCounts.set(normalizedKey, {
            count: 1,
            latestWeek: t.week_start,
            originalText: cleanReason,
          });
        }
      }
    }
  });

  const recurringBlockers: RecurringBlockerItem[] = Array.from(blockerCounts.values())
    .sort((a, b) => b.count - a.count || b.latestWeek.localeCompare(a.latestWeek))
    .map((item) => ({
      description: item.originalText,
      count: item.count,
      latestWeek: item.latestWeek,
    }));

  return { weeklyBlockers, recurringBlockers };
}

/**
 * Builds per-member workload distribution (ADMIN only, alphabetical by member name).
 */
export function buildWorkloadMetrics(tasks: DbTask[], profiles: Profile[]): WorkloadMetric[] {
  const memberTasksMap = new Map<string, DbTask[]>();
  profiles.forEach((p) => memberTasksMap.set(p.id, []));

  tasks.forEach((t) => {
    if (memberTasksMap.has(t.owner_id)) {
      memberTasksMap.get(t.owner_id)!.push(t);
    }
  });

  const sortedProfiles = [...profiles].sort((a, b) => {
    const nameA = (a.full_name || a.email || "").toLowerCase();
    const nameB = (b.full_name || b.email || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return sortedProfiles.map((p) => {
    const pTasks = memberTasksMap.get(p.id) || [];
    const planned = pTasks.length;
    const completed = pTasks.filter((t) => t.status === "DONE").length;
    const active = pTasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW").length;
    const blocked = pTasks.filter((t) => t.status === "BLOCKED" || t.is_blocked).length;
    const critical = pTasks.filter(
      (t) => (t.status === "BLOCKED" || t.is_blocked) && t.priority === "CRITICAL"
    ).length;
    const completionRate = calculateCompletionRate(completed, planned);

    return {
      memberId: p.id,
      memberName: p.full_name || p.email.split("@")[0],
      avatarUrl: p.avatar_url,
      role: p.role,
      planned,
      completed,
      active,
      blocked,
      critical,
      completionRate,
    };
  });
}

/**
 * Builds aggregate overview stats across the chosen date range.
 */
export function buildInsightsOverviewStats(
  weeklyTasks: WeeklyTaskMetric[],
  weeklyGoals: WeeklyGoalMetric[],
  weeklyCarryovers: WeeklyCarryoverMetric[]
): InsightsOverviewStats {
  const totalTasksPlanned = weeklyTasks.reduce((s, w) => s + w.plannedTasks, 0);
  const totalTasksCompleted = weeklyTasks.reduce((s, w) => s + w.completedTasks, 0);
  const avgCompletionRate = calculateCompletionRate(totalTasksCompleted, totalTasksPlanned);

  const totalCarryoversOut = weeklyCarryovers.reduce((s, w) => s + w.carryoversOut, 0);
  const totalBlockedTasks = weeklyTasks.reduce((s, w) => s + w.blockedCount, 0);

  const totalGoalsCommitted = weeklyGoals.reduce((s, w) => s + w.goalsCommitted, 0);
  const totalGoalsAchieved = weeklyGoals.reduce((s, w) => s + w.goalsAchieved, 0);
  const goalAchievementRate =
    totalGoalsCommitted > 0 ? Math.round((totalGoalsAchieved / totalGoalsCommitted) * 100) : null;

  const validProgressGoals = weeklyGoals.filter((g) => g.averageGoalProgress !== null);
  const avgGoalProgress =
    validProgressGoals.length > 0
      ? Math.round(
          validProgressGoals.reduce((s, g) => s + (g.averageGoalProgress || 0), 0) /
            validProgressGoals.length
        )
      : null;

  return {
    avgCompletionRate,
    totalTasksPlanned,
    totalTasksCompleted,
    totalCarryoversOut,
    totalBlockedTasks,
    goalAchievementRate,
    avgGoalProgress,
  };
}

/**
 * Builds week-over-week delta comparison for the latest two weeks in the range.
 */
export function buildWeekOverWeekComparison(
  weeklyTasks: WeeklyTaskMetric[],
  weeklyGoals: WeeklyGoalMetric[],
  weeklyCarryovers: WeeklyCarryoverMetric[],
  weeklyBlockers: WeeklyBlockerMetric[]
): WeekOverWeekComparison | null {
  if (weeklyTasks.length < 2) return null;

  const currentT = weeklyTasks[weeklyTasks.length - 1];
  const prevT = weeklyTasks[weeklyTasks.length - 2];

  const currentG = weeklyGoals[weeklyGoals.length - 1];
  const prevG = weeklyGoals[weeklyGoals.length - 2];

  const currentC = weeklyCarryovers[weeklyCarryovers.length - 1];
  const prevC = weeklyCarryovers[weeklyCarryovers.length - 2];

  const currentB = weeklyBlockers[weeklyBlockers.length - 1];
  const prevB = weeklyBlockers[weeklyBlockers.length - 2];

  const rateDiff =
    currentT.completionRate !== null && prevT.completionRate !== null
      ? currentT.completionRate - prevT.completionRate
      : null;

  const goalProgDiff =
    currentG?.averageGoalProgress !== null && prevG?.averageGoalProgress !== null
      ? (currentG?.averageGoalProgress ?? 0) - (prevG?.averageGoalProgress ?? 0)
      : null;

  return {
    currentWeek: currentT.weekStart,
    previousWeek: prevT.weekStart,
    plannedDelta: {
      current: currentT.plannedTasks,
      prev: prevT.plannedTasks,
      diff: currentT.plannedTasks - prevT.plannedTasks,
    },
    completionRateDelta: {
      current: currentT.completionRate,
      prev: prevT.completionRate,
      diff: rateDiff,
    },
    carryoversDelta: {
      current: currentC?.carryoversOut || 0,
      prev: prevC?.carryoversOut || 0,
      diff: (currentC?.carryoversOut || 0) - (prevC?.carryoversOut || 0),
    },
    blockersDelta: {
      current: currentB?.blockedTasks || 0,
      prev: prevB?.blockedTasks || 0,
      diff: (currentB?.blockedTasks || 0) - (prevB?.blockedTasks || 0),
    },
    goalsAchievedDelta: {
      current: currentG?.goalsAchieved || 0,
      prev: prevG?.goalsAchieved || 0,
      diff: (currentG?.goalsAchieved || 0) - (prevG?.goalsAchieved || 0),
    },
    avgGoalProgressDelta: {
      current: currentG?.averageGoalProgress ?? null,
      prev: prevG?.averageGoalProgress ?? null,
      diff: goalProgDiff,
    },
  };
}

/**
 * Generates rule-based deterministic attention signals (factual observations only).
 */
export function generateInsightSignals(
  weeklyTasks: WeeklyTaskMetric[],
  weeklyCarryovers: WeeklyCarryoverMetric[],
  weeklyBlockers: WeeklyBlockerMetric[],
  recurringBlockers: RecurringBlockerItem[]
): InsightSignal[] {
  const signals: InsightSignal[] = [];

  if (weeklyTasks.length < 3) {
    return signals; // Do not infer trend claims with fewer than 3 weeks
  }

  // 1. Completion Rate Trend Signal
  const rates = weeklyTasks
    .map((w) => w.completionRate)
    .filter((r): r is number => r !== null);

  if (rates.length >= 3) {
    const last3 = rates.slice(-3);
    const isIncreasing = last3[0] < last3[1] && last3[1] < last3[2];
    const isDecreasing = last3[0] > last3[1] && last3[1] > last3[2];

    if (isIncreasing) {
      signals.push({
        id: "sig_completion_improving",
        type: "positive",
        category: "completion",
        title: "Completion Rate Trend",
        description: `Task completion rate increased for 3 consecutive weeks (${last3[0]}% → ${last3[1]}% → ${last3[2]}%).`,
      });
    } else if (isDecreasing) {
      signals.push({
        id: "sig_completion_declining",
        type: "warning",
        category: "completion",
        title: "Completion Rate Trend",
        description: `Task completion rate declined across 3 consecutive weeks (${last3[0]}% → ${last3[1]}% → ${last3[2]}%).`,
      });
    }
  }

  // 2. Carryover Trend Signal
  const carryoverCounts = weeklyCarryovers.map((w) => w.carryoversOut);
  if (carryoverCounts.length >= 3) {
    const last3Carry = carryoverCounts.slice(-3);
    const isCarryIncreasing = last3Carry[0] < last3Carry[1] && last3Carry[1] < last3Carry[2] && last3Carry[2] > 0;
    if (isCarryIncreasing) {
      signals.push({
        id: "sig_carryover_increasing",
        type: "warning",
        category: "carryover",
        title: "Carryover Increase",
        description: `Carryovers increased for 3 consecutive weeks (${last3Carry[0]} → ${last3Carry[1]} → ${last3Carry[2]} tasks carried forward).`,
      });
    }
  }

  // 3. Repeated Carryovers Signal
  const totalRepeated = weeklyCarryovers.reduce((sum, w) => sum + w.repeatedCarryovers, 0);
  if (totalRepeated > 0) {
    signals.push({
      id: "sig_repeated_carryover",
      type: "warning",
      category: "carryover",
      title: "Repeated Carryovers Detected",
      description: `${totalRepeated} task ${totalRepeated === 1 ? "lineage has" : "lineages have"} been carried forward across multiple weekly cycles.`,
    });
  }

  // 4. Critical Blockers Signal
  const weeksWithCriticalBlockers = weeklyBlockers.filter((w) => w.criticalBlockers > 0).length;
  if (weeksWithCriticalBlockers >= 2) {
    signals.push({
      id: "sig_critical_blockers_recurring",
      type: "warning",
      category: "blocker",
      title: "Critical Blockers Recurring",
      description: `Critical blockers were recorded in ${weeksWithCriticalBlockers} of the last ${weeklyBlockers.length} weeks.`,
    });
  }

  // 5. Overcommitment Observation
  if (weeklyTasks.length >= 2) {
    const current = weeklyTasks[weeklyTasks.length - 1];
    const prev = weeklyTasks[weeklyTasks.length - 2];
    if (
      prev.plannedTasks > 0 &&
      current.plannedTasks >= prev.plannedTasks * 1.35 &&
      current.completionRate !== null &&
      prev.completionRate !== null &&
      current.completionRate <= prev.completionRate - 10
    ) {
      const plannedGrowth = Math.round(((current.plannedTasks - prev.plannedTasks) / prev.plannedTasks) * 100);
      signals.push({
        id: "sig_overcommitment_pattern",
        type: "info",
        category: "commitment",
        title: "Commitment vs Completion Shift",
        description: `Task commitment increased ${plannedGrowth}% week-over-week while completion rate changed from ${prev.completionRate}% to ${current.completionRate}%.`,
      });
    }
  }

  // 6. Top Recurring Blocker Note Observation
  if (recurringBlockers.length > 0 && recurringBlockers[0].count >= 2) {
    const top = recurringBlockers[0];
    signals.push({
      id: "sig_top_blocker",
      type: "info",
      category: "blocker",
      title: "Frequent Blocker Description",
      description: `"${top.description}" was cited in ${top.count} blocked tasks during this timeframe.`,
    });
  }

  return signals;
}
