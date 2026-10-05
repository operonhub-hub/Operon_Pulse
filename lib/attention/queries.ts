import { createClient } from "@/lib/supabase/server";
import { getCurrentUserSession } from "@/lib/auth/session";
import { UserRole, DbTask, TaskWeeklyReview, WeeklyCheckin } from "@/types";
import {
  getMondayDateString,
  getPreviousWeekMonday,
  getTodayDateString,
  getDaysAheadDateString,
  isThursdayOrLater,
} from "@/lib/utils/date";
import {
  AttentionCenterData,
  DbAttentionState,
  AttentionItem,
} from "./types";
import {
  buildTaskAttention,
  buildReviewAttention,
  buildCheckinAttention,
  buildGoalAttention,
  buildAdminAggregateAttention,
  mergeAttentionState,
  calculateAttentionSummary,
} from "./logic";
import { getGoalsWithTaskSummary } from "@/lib/goals/queries";
import { getTeamMembersList } from "@/lib/tasks/queries";

/**
 * Fetches persisted interaction state for a user from public.attention_states.
 * Falls back gracefully to an empty map if table is not yet migrated in database.
 */
async function fetchUserAttentionStates(
  userId: string
): Promise<Map<string, DbAttentionState>> {
  const supabase = await createClient();
  const map = new Map<string, DbAttentionState>();

  if (!supabase || !userId) {
    return map;
  }

  try {
    const { data, error } = await supabase
      .from("attention_states")
      .select("*")
      .eq("user_id", userId);

    if (error || !data) {
      return map;
    }

    for (const row of data) {
      map.set(row.attention_key, row as DbAttentionState);
    }
  } catch {
    // Graceful fallback if table does not exist
  }

  return map;
}

/**
 * Primary authenticated entry point. Resolves user identity and role server-side.
 */
export async function getCurrentUserAttentionCenterData(
  options?: { currentDate?: Date | string }
): Promise<AttentionCenterData> {
  const session = await getCurrentUserSession();
  if (!session.user?.id) {
    return calculateAttentionSummary([]);
  }

  const role = session.profile?.role || (session.displayUser.role as UserRole) || "MEMBER";
  return getUserAttentionCenterData(session.user.id, role, options);
}

/**
 * Retrieves the complete derived Attention Center dataset for the specified user and role.
 * Strictly scopes data queries based on userRole.
 */
export async function getUserAttentionCenterData(
  userId: string,
  userRole: UserRole,
  options?: { currentDate?: Date | string }
): Promise<AttentionCenterData> {
  const currentDate = options?.currentDate
    ? typeof options.currentDate === "string"
      ? new Date(options.currentDate + "T00:00:00Z")
      : options.currentDate
    : new Date();

  const currentWeekStart = getMondayDateString(currentDate);
  const prevWeekStart = getPreviousWeekMonday(currentWeekStart);
  const todayStr = getTodayDateString(currentDate);
  const dueSoonThresholdStr = getDaysAheadDateString(2, currentDate);
  const isCheckinDay = isThursdayOrLater(currentDate);

  const supabase = await createClient();
  if (!supabase || !userId) {
    return calculateAttentionSummary([]);
  }

  const stateMapPromise = fetchUserAttentionStates(userId);

  if (userRole === "MEMBER") {
    // -------------------------------------------------------------
    // MEMBER SCOPE: Strictly personal data queries
    // -------------------------------------------------------------
    const [
      stateMap,
      userCurrentTasksRes,
      userPrevTasksRes,
      userCheckinRes,
    ] = await Promise.all([
      stateMapPromise,
      supabase
        .from("tasks")
        .select("*")
        .eq("owner_id", userId)
        .eq("week_start", currentWeekStart),
      supabase
        .from("tasks")
        .select("*")
        .eq("owner_id", userId)
        .eq("week_start", prevWeekStart)
        .neq("status", "DONE"),
      supabase
        .from("weekly_checkins")
        .select("*")
        .eq("user_id", userId)
        .eq("week_start", currentWeekStart)
        .maybeSingle(),
    ]);

    const userCurrentTasks = (userCurrentTasksRes.data as DbTask[]) || [];
    const userPrevIncompleteTasks = (userPrevTasksRes.data as DbTask[]) || [];
    const userCheckin = (userCheckinRes.data as WeeklyCheckin) || null;

    // Scoped Review Query: Only query reviews for the Member's own previous-week incomplete tasks
    let prevReviews: TaskWeeklyReview[] = [];
    const prevTaskIds = userPrevIncompleteTasks.map((t) => t.id);
    if (prevTaskIds.length > 0) {
      const { data: reviewsData } = await supabase
        .from("task_weekly_reviews")
        .select("*")
        .in("task_id", prevTaskIds)
        .eq("week_start", prevWeekStart);
      prevReviews = (reviewsData as TaskWeeklyReview[]) || [];
    }

    // Derive Member Attention Items
    const taskItems = buildTaskAttention(userCurrentTasks, todayStr, dueSoonThresholdStr);
    const reviewItems = buildReviewAttention(
      userPrevIncompleteTasks,
      prevReviews,
      userId,
      prevWeekStart
    );
    const checkinItems = buildCheckinAttention(
      userId,
      userCheckin,
      currentWeekStart,
      isCheckinDay
    );

    const rawItems: AttentionItem[] = [
      ...taskItems,
      ...reviewItems,
      ...checkinItems,
    ];

    const mergedItems = mergeAttentionState(rawItems, stateMap);
    return calculateAttentionSummary(mergedItems);
  }

  // -----------------------------------------------------------------
  // ADMIN SCOPE: Personal items + company goals + team aggregates
  // -----------------------------------------------------------------
  const [
    stateMap,
    adminPersonalTasksRes,
    adminPrevTasksRes,
    { goals: currentWeekGoals },
    allCurrentWeekTasksRes,
    allPrevWeekTasksRes,
    allPrevReviewsRes,
    adminCheckinRes,
    allCurrentCheckinsRes,
    teamMembers,
  ] = await Promise.all([
    stateMapPromise,
    supabase
      .from("tasks")
      .select("*")
      .eq("owner_id", userId)
      .eq("week_start", currentWeekStart),
    supabase
      .from("tasks")
      .select("*")
      .eq("owner_id", userId)
      .eq("week_start", prevWeekStart)
      .neq("status", "DONE"),
    getGoalsWithTaskSummary(currentWeekStart),
    supabase
      .from("tasks")
      .select("id, priority, status, is_blocked")
      .eq("week_start", currentWeekStart),
    supabase
      .from("tasks")
      .select("id, status")
      .eq("week_start", prevWeekStart)
      .neq("status", "DONE"),
    supabase
      .from("task_weekly_reviews")
      .select("task_id, week_start")
      .eq("week_start", prevWeekStart),
    supabase
      .from("weekly_checkins")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start", currentWeekStart)
      .maybeSingle(),
    supabase
      .from("weekly_checkins")
      .select("user_id, is_submitted")
      .eq("week_start", currentWeekStart)
      .eq("is_submitted", true),
    getTeamMembersList({ activeOnly: true }),
  ]);

  const adminPersonalTasks = (adminPersonalTasksRes.data as DbTask[]) || [];
  const adminPrevIncompleteTasks = (adminPrevTasksRes.data as DbTask[]) || [];
  const allPrevReviews = (allPrevReviewsRes.data as TaskWeeklyReview[]) || [];
  const adminCheckin = (adminCheckinRes.data as WeeklyCheckin) || null;

  // 1. Admin Personal task items
  const personalTaskItems = buildTaskAttention(
    adminPersonalTasks,
    todayStr,
    dueSoonThresholdStr
  );
  const personalReviewItems = buildReviewAttention(
    adminPrevIncompleteTasks,
    allPrevReviews,
    userId,
    prevWeekStart
  );
  const personalCheckinItems = buildCheckinAttention(
    userId,
    adminCheckin,
    currentWeekStart,
    isCheckinDay
  );

  // 2. Admin Goals items (OFF_TRACK & AT_RISK)
  const goalItems = buildGoalAttention(currentWeekGoals, currentWeekStart);

  // 3. Admin Team aggregates
  const allCurrentTasks = allCurrentWeekTasksRes.data || [];
  const criticalBlockedCount = allCurrentTasks.filter(
    (t) =>
      t.priority === "CRITICAL" &&
      (t.status === "BLOCKED" || Boolean(t.is_blocked))
  ).length;

  const submittedUserIds = new Set(
    (allCurrentCheckinsRes.data || []).map((c) => c.user_id)
  );
  const activeTeamMembers = teamMembers.filter((m) => m.is_active !== false);
  const pendingCheckinsCount = Math.max(
    0,
    activeTeamMembers.filter((m) => !submittedUserIds.has(m.id)).length
  );

  const reviewedPrevTaskIds = new Set(allPrevReviews.map((r) => r.task_id));
  const allPrevIncomplete = allPrevWeekTasksRes.data || [];
  const pendingReviewsCount = allPrevIncomplete.filter(
    (t) => !reviewedPrevTaskIds.has(t.id)
  ).length;

  const adminAggregateItems = buildAdminAggregateAttention({
    criticalBlockedTasksCount: criticalBlockedCount,
    pendingCheckinsCount,
    pendingReviewsCount,
    currentWeekStart,
    prevWeekStart,
    isCheckinDay,
  });

  const rawItems: AttentionItem[] = [
    ...personalTaskItems,
    ...personalReviewItems,
    ...personalCheckinItems,
    ...goalItems,
    ...adminAggregateItems,
  ];

  const mergedItems = mergeAttentionState(rawItems, stateMap);
  return calculateAttentionSummary(mergedItems);
}
