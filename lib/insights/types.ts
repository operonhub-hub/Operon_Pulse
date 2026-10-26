import { Profile, WeeklyGoal } from "@/types";

export interface InsightsRange {
  from: string; // YYYY-MM-DD (Monday)
  to: string;   // YYYY-MM-DD (Monday)
  weeksCount: number;
  label: string;
  preset?: "4w" | "8w" | "12w" | "custom";
}

export interface WeeklyTaskMetric {
  weekStart: string;
  formattedWeek: string;
  plannedTasks: number;
  completedTasks: number;
  completionRate: number | null; // null if planned === 0
  incompleteTasks: number;
  notStartedCount: number;
  inProgressCount: number;
  inReviewCount: number;
  blockedCount: number;
  criticalBlockedCount: number;
  overdueCount: number;
}

export interface WeeklyGoalMetric {
  weekStart: string;
  formattedWeek: string;
  goalsCommitted: number;
  goalsAchieved: number;
  goalsAtRisk: number;
  goalsOffTrack: number;
  achievementRate: number | null; // null if committed === 0
  averageGoalProgress: number | null; // 0 to 100 or null if committed === 0
}

export interface WeeklyCarryoverMetric {
  weekStart: string;
  formattedWeek: string;
  incompleteTasks: number;
  carryoversOut: number;
  carryoverRate: number | null; // null if incomplete === 0
  repeatedCarryovers: number;
}

export interface WeeklyBlockerMetric {
  weekStart: string;
  formattedWeek: string;
  blockedTasks: number;
  criticalBlockers: number;
}

export interface RecurringBlockerItem {
  description: string;
  count: number;
  latestWeek: string;
}

export interface WorkloadMetric {
  memberId: string;
  memberName: string;
  avatarUrl: string | null;
  role: string;
  // Owner metrics (unchanged)
  planned: number;
  completed: number;
  active: number;
  blocked: number;
  critical: number;
  completionRate: number | null;
  // Support metrics (tasks where the member is support person, not owner)
  supported: number;
  supportedCompleted: number;
  supportCompletionRate: number | null;
  /** owned completed + supported completed */
  contributions: number;
}

/** Support activity for one member over the selected range. */
export interface MemberSupportSummary {
  memberId: string;
  supported: number;
  supportedCompleted: number;
  supportCompletionRate: number | null;
  ownedCompleted: number;
  /** owned completed + supported completed */
  contributions: number;
}

/**
 * Team-level totals. Every task counts exactly once, even when one member owns it
 * and another supports it (so the sum of member contributions can be larger).
 */
export interface TeamContributionTotals {
  /** Distinct completed tasks in range. */
  completedTasks: number;
  /** Distinct completed tasks that had a (different) support person. */
  completedWithSupport: number;
  /** Distinct tasks with a (different) support person. */
  supportedTasks: number;
  /** Sum of every member's contributions (double-counts supported tasks by design). */
  sumOfMemberContributions: number;
}

export interface InsightSignal {
  id: string;
  type: "info" | "warning" | "positive";
  title: string;
  description: string;
  category: "completion" | "carryover" | "blocker" | "commitment" | "general";
}

export interface InsightsOverviewStats {
  avgCompletionRate: number | null;
  totalTasksPlanned: number;
  totalTasksCompleted: number;
  totalCarryoversOut: number;
  totalBlockedTasks: number;
  goalAchievementRate: number | null;
  avgGoalProgress: number | null;
}

export interface WeekOverWeekComparison {
  currentWeek: string;
  previousWeek: string;
  plannedDelta: { current: number; prev: number; diff: number };
  completionRateDelta: { current: number | null; prev: number | null; diff: number | null };
  carryoversDelta: { current: number; prev: number; diff: number };
  blockersDelta: { current: number; prev: number; diff: number };
  goalsAchievedDelta: { current: number; prev: number; diff: number };
  avgGoalProgressDelta: { current: number | null; prev: number | null; diff: number | null };
}

export interface InsightsDataset {
  range: InsightsRange;
  isAdmin: boolean;
  selectedMemberId: string | null;
  selectedMemberProfile?: Profile | null;
  weeks: string[];
  weeklyTasks: WeeklyTaskMetric[];
  weeklyGoals: WeeklyGoalMetric[];
  weeklyCarryovers: WeeklyCarryoverMetric[];
  weeklyBlockers: WeeklyBlockerMetric[];
  recurringBlockers: RecurringBlockerItem[];
  workload: WorkloadMetric[];
  overviewStats: InsightsOverviewStats;
  comparison: WeekOverWeekComparison | null;
  signals: InsightSignal[];
  teamMembers: Profile[];
  contributedGoals?: WeeklyGoal[];
  /** Support metrics for the viewed member (self for members, filtered member for admins). */
  supportSummary: MemberSupportSummary | null;
  /** Admin team view only. */
  teamTotals: TeamContributionTotals | null;
}
