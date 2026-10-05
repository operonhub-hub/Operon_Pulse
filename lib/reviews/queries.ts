import { createClient } from "@/lib/supabase/server";
import {
  TaskWeeklyReview,
  WeeklyCheckin,
  TeamMemberCheckinStatus,
  TaskWithAssignees,
  GoalWithTaskSummary,
  Profile,
  WeeklyExecutionSummary,
} from "@/types";
import { getTasksForWeek, getTeamMembersList } from "@/lib/tasks/queries";
import { getGoalsWithTaskSummary } from "@/lib/goals/queries";
import { calculateWeeklyExecutionSummary } from "./logic";

/**
 * Retrieves all task review decisions recorded for a specific source week.
 */
export async function getTaskReviewOutcomes(
  weekStart: string
): Promise<TaskWeeklyReview[]> {
  const supabase = await createClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("task_weekly_reviews")
    .select(`
      *,
      reviewer:reviewed_by (id, full_name, email, role, avatar_url)
    `)
    .eq("week_start", weekStart)
    .order("created_at", { ascending: false });

  if (error) {
    // Graceful fallback if table is not yet created
    return [];
  }

  return (data as TaskWeeklyReview[]) || [];
}

/**
 * Retrieves a specific user's check-in for a given week.
 */
export async function getWeeklyCheckin(
  userId: string,
  weekStart: string
): Promise<WeeklyCheckin | null> {
  const supabase = await createClient();

  if (!supabase || !userId) {
    return null;
  }

  const { data, error } = await supabase
    .from("weekly_checkins")
    .select(`
      *,
      user:user_id (id, full_name, email, role, avatar_url)
    `)
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as WeeklyCheckin;
}

/**
 * Retrieves all check-ins for a week (Admins read all, Members read own via RLS).
 */
export async function getAllWeeklyCheckins(
  weekStart: string
): Promise<WeeklyCheckin[]> {
  const supabase = await createClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("weekly_checkins")
    .select(`
      *,
      user:user_id (id, full_name, email, role, avatar_url)
    `)
    .eq("week_start", weekStart)
    .order("submitted_at", { ascending: false });

  if (error) {
    return [];
  }

  return (data as WeeklyCheckin[]) || [];
}

/**
 * Retrieves team check-in submission status roster for Admins.
 */
export async function getTeamCheckinStatus(
  weekStart: string,
  teamMembers: Profile[]
): Promise<TeamMemberCheckinStatus[]> {
  const activeMembers = teamMembers.filter((m) => m.is_active !== false);
  const checkins = await getAllWeeklyCheckins(weekStart);
  const checkinMap = new Map<string, WeeklyCheckin>();
  checkins.forEach((c) => checkinMap.set(c.user_id, c));

  return activeMembers.map((member) => ({
    profile: member,
    hasSubmitted: checkinMap.has(member.id),
    checkin: checkinMap.get(member.id) || null,
  }));
}

/**
 * Retrieves aggregated review package for the /weekly-review page.
 */
export async function getWeeklyReviewData(
  weekStart: string,
  currentUserId: string
): Promise<{
  tasks: TaskWithAssignees[];
  incompleteTasks: TaskWithAssignees[];
  goals: GoalWithTaskSummary[];
  reviews: TaskWeeklyReview[];
  userCheckin: WeeklyCheckin | null;
  teamCheckins: TeamMemberCheckinStatus[];
  summary: WeeklyExecutionSummary;
  teamMembers: Profile[];
}> {
  const [tasks, { goals }, reviews, teamMembers] = await Promise.all([
    getTasksForWeek(weekStart),
    getGoalsWithTaskSummary(weekStart),
    getTaskReviewOutcomes(weekStart),
    getTeamMembersList({ activeOnly: true }),
  ]);

  // Attach review outcomes to tasks
  const reviewMap = new Map<string, TaskWeeklyReview>();
  reviews.forEach((r) => reviewMap.set(r.task_id, r));

  const enrichedTasks = tasks.map((t) => ({
    ...t,
    review_outcome: reviewMap.get(t.id)?.outcome || null,
  }));

  const incompleteTasks = enrichedTasks.filter((t) => t.status !== "DONE");

  const [userCheckin, teamCheckins] = await Promise.all([
    getWeeklyCheckin(currentUserId, weekStart),
    getTeamCheckinStatus(weekStart, teamMembers),
  ]);

  const allCheckins = await getAllWeeklyCheckins(weekStart);
  const summary = calculateWeeklyExecutionSummary(
    enrichedTasks,
    goals,
    allCheckins,
    reviews,
    teamMembers.length,
    weekStart
  );

  return {
    tasks: enrichedTasks,
    incompleteTasks,
    goals,
    reviews,
    userCheckin,
    teamCheckins,
    summary,
    teamMembers,
  };
}
