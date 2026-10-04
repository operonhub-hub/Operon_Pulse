import { createClient } from "@/lib/supabase/server";
import {
  DbTask,
  WeeklyGoal,
  TaskWeeklyReview,
  Profile,
} from "@/types";
import {
  InsightsDataset,
  InsightsRange,
} from "./types";
import {
  buildWeeklyTaskMetrics,
  buildWeeklyGoalMetrics,
  buildWeeklyCarryoverMetrics,
  buildWeeklyBlockerMetrics,
  buildWorkloadMetrics,
  buildInsightsOverviewStats,
  buildWeekOverWeekComparison,
  generateInsightSignals,
} from "./logic";
import { getMondayDateString } from "@/lib/utils/date";

/**
 * Generates an array of contiguous Monday dates between fromDate and toDate (inclusive).
 */
export function generateMondayRange(fromMonday: string, toMonday: string): string[] {
  const weeks: string[] = [];
  const current = new Date(fromMonday + "T00:00:00");
  const end = new Date(toMonday + "T00:00:00");

  while (current <= end && weeks.length < 52) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");
    weeks.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

/**
 * Computes Monday date offset by N weeks.
 */
function getOffsetMonday(baseMonday: string, offsetWeeks: number): string {
  const date = new Date(baseMonday + "T00:00:00");
  date.setDate(date.getDate() + offsetWeeks * 7);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface InsightsQueryParams {
  from?: string;
  to?: string;
  memberId?: string;
  preset?: "4w" | "8w" | "12w" | "custom";
}

/**
 * Retrieves the full bounded dataset and calculated analytics for the /insights dashboard.
 */
export async function getInsightsDataset(
  params: InsightsQueryParams = {}
): Promise<InsightsDataset | null> {
  const supabase = await createClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch current user's profile
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const isAdmin = currentProfile?.role === "ADMIN";

  // Calculate default / validated date ranges
  const currentWeekMonday = getMondayDateString();
  let toDate = params.to && /^\d{4}-\d{2}-\d{2}$/.test(params.to)
    ? getMondayDateString(params.to)
    : currentWeekMonday;

  // Preset calculation if provided
  let fromDate = "";
  if (params.preset === "12w") {
    fromDate = getOffsetMonday(toDate, -11);
  } else if (params.preset === "8w") {
    fromDate = getOffsetMonday(toDate, -7);
  } else if (params.preset === "4w") {
    fromDate = getOffsetMonday(toDate, -3);
  } else if (params.from && /^\d{4}-\d{2}-\d{2}$/.test(params.from)) {
    fromDate = getMondayDateString(params.from);
  } else {
    // Default to 4 weeks
    fromDate = getOffsetMonday(toDate, -3);
  }

  // Guard: if from > to, swap
  if (fromDate > toDate) {
    const temp = fromDate;
    fromDate = toDate;
    toDate = temp;
  }

  const weeks = generateMondayRange(fromDate, toDate);
  const weeksCount = weeks.length;

  const range: InsightsRange = {
    from: fromDate,
    to: toDate,
    weeksCount,
    label: `${fromDate} to ${toDate} (${weeksCount} ${weeksCount === 1 ? "week" : "weeks"})`,
    preset: params.preset || (weeksCount === 4 ? "4w" : weeksCount === 8 ? "8w" : weeksCount === 12 ? "12w" : "custom"),
  };

  // Fetch Team Profiles (only for ADMIN)
  let teamMembers: Profile[] = [];
  if (isAdmin) {
    const { data: members } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true });
    teamMembers = (members as Profile[]) || [];
  } else if (currentProfile) {
    // MEMBER dataset only contains own profile
    teamMembers = [currentProfile as Profile];
  }

  // Determine effective member scope
  let effectiveMemberId: string | null = null;
  if (isAdmin) {
    if (params.memberId && params.memberId !== "ALL") {
      // Validate that requested member UUID exists in team profiles
      const profileExists = teamMembers.some((m) => m.id === params.memberId);
      effectiveMemberId = profileExists ? params.memberId : null;
    }
  } else {
    // MEMBER role is strictly forced to own authenticated identity; query params are ignored
    effectiveMemberId = user.id;
  }

  // Query bounded tasks (scoped to member if effectiveMemberId is set)
  let tasksQuery = supabase
    .from("tasks")
    .select("*")
    .gte("week_start", fromDate)
    .lte("week_start", toDate);

  if (effectiveMemberId) {
    tasksQuery = tasksQuery.eq("owner_id", effectiveMemberId);
  }

  // Query bounded goals
  const goalsQuery = supabase
    .from("weekly_goals")
    .select(`
      *,
      owner:owner_id (id, full_name, email, role, avatar_url),
      created_by_profile:created_by (id, full_name, email, role, avatar_url)
    `)
    .gte("week_start", fromDate)
    .lte("week_start", toDate);

  // Query bounded reviews
  const reviewsQuery = supabase
    .from("task_weekly_reviews")
    .select("*")
    .gte("week_start", fromDate)
    .lte("week_start", toDate);

  // Execute bounded queries in parallel
  const [tasksRes, goalsRes, reviewsRes] = await Promise.all([
    tasksQuery,
    goalsQuery,
    reviewsQuery,
  ]);

  const tasks = (tasksRes.data as DbTask[]) || [];
  const goals = (goalsRes.data as WeeklyGoal[]) || [];
  const allReviews = (reviewsRes.data as TaskWeeklyReview[]) || [];

  // Carryover scoping: for member view or member filter, only include reviews for tasks owned by that member
  let scopedReviews: TaskWeeklyReview[] = allReviews;
  if (effectiveMemberId) {
    const ownedTaskIds = new Set(tasks.map((t) => t.id));
    scopedReviews = allReviews.filter((r) => ownedTaskIds.has(r.task_id));
  }

  // If Admin wants full workload across team while filtering, query all tasks in range for workload table
  let allRangeTasks: DbTask[] = tasks;
  if (isAdmin && effectiveMemberId) {
    const { data: teamTasksData } = await supabase
      .from("tasks")
      .select("*")
      .gte("week_start", fromDate)
      .lte("week_start", toDate);
    allRangeTasks = (teamTasksData as DbTask[]) || [];
  }

  // Execute pure metric calculations
  const weeklyTasks = buildWeeklyTaskMetrics(tasks, weeks, currentWeekMonday);
  const weeklyGoals = buildWeeklyGoalMetrics(goals, tasks, weeks);
  const weeklyCarryovers = buildWeeklyCarryoverMetrics(tasks, scopedReviews, weeks);
  const { weeklyBlockers, recurringBlockers } = buildWeeklyBlockerMetrics(tasks, weeks);
  // Workload is strictly for ADMIN only (empty array for MEMBER)
  const workload = isAdmin ? buildWorkloadMetrics(allRangeTasks, teamMembers) : [];
  const overviewStats = buildInsightsOverviewStats(weeklyTasks, weeklyGoals, weeklyCarryovers);
  const comparison = buildWeekOverWeekComparison(weeklyTasks, weeklyGoals, weeklyCarryovers, weeklyBlockers);
  const signals = generateInsightSignals(weeklyTasks, weeklyCarryovers, weeklyBlockers, recurringBlockers);

  // For members, find strategic goals their tasks contributed to
  let contributedGoals: WeeklyGoal[] | undefined = undefined;
  if (!isAdmin) {
    const memberGoalIds = new Set(tasks.map((t) => t.goal_id).filter(Boolean));
    contributedGoals = goals.filter((g) => memberGoalIds.has(g.id));
  }

  const selectedMemberProfile = effectiveMemberId
    ? teamMembers.find((m) => m.id === effectiveMemberId) || (currentProfile as Profile)
    : null;

  return {
    range,
    isAdmin,
    selectedMemberId: effectiveMemberId,
    selectedMemberProfile,
    weeks,
    weeklyTasks,
    weeklyGoals,
    weeklyCarryovers,
    weeklyBlockers,
    recurringBlockers,
    workload,
    overviewStats,
    comparison,
    signals,
    teamMembers,
    contributedGoals,
  };
}
