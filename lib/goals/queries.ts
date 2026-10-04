import { createClient } from "@/lib/supabase/server";
import { WeeklyGoal, GoalWithTaskSummary, TaskWithAssignees } from "@/types";
import { getGoalTaskSummary } from "./logic";
import { getTasksForWeek } from "@/lib/tasks/queries";

/**
 * Retrieves weekly company goals for a specific week_start date (YYYY-MM-DD).
 */
export async function getGoalsForWeek(weekStart: string): Promise<WeeklyGoal[]> {
  const supabase = await createClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("weekly_goals")
    .select(`
      *,
      owner:owner_id (id, full_name, email, role, avatar_url),
      created_by_profile:created_by (id, full_name, email, role, avatar_url)
    `)
    .eq("week_start", weekStart)
    .order("created_at", { ascending: true });

  if (error) {
    return [];
  }

  return (data as WeeklyGoal[]) || [];
}

/**
 * Retrieves goals for a week combined with linked task metrics and risk signals.
 */
export async function getGoalsWithTaskSummary(
  weekStart: string
): Promise<{ goals: GoalWithTaskSummary[]; allWeekTasks: TaskWithAssignees[] }> {
  const [goals, allWeekTasks] = await Promise.all([
    getGoalsForWeek(weekStart),
    getTasksForWeek(weekStart),
  ]);

  const summaries = goals.map((goal) => getGoalTaskSummary(goal, allWeekTasks));

  return { goals: summaries, allWeekTasks };
}

/**
 * Retrieves a single goal by ID with its linked tasks.
 */
export async function getGoalWithTasks(
  goalId: string
): Promise<{ goal: WeeklyGoal | null; linkedTasks: TaskWithAssignees[] }> {
  const supabase = await createClient();

  if (!supabase || !goalId) {
    return { goal: null, linkedTasks: [] };
  }

  const { data: goalData, error: goalError } = await supabase
    .from("weekly_goals")
    .select(`
      *,
      owner:owner_id (id, full_name, email, role, avatar_url),
      created_by_profile:created_by (id, full_name, email, role, avatar_url)
    `)
    .eq("id", goalId)
    .single();

  if (goalError || !goalData) {
    return { goal: null, linkedTasks: [] };
  }

  const { data: tasksData } = await supabase
    .from("tasks")
    .select(`
      *,
      owner:owner_id (id, full_name, email, role, avatar_url),
      created_by_profile:created_by (id, full_name, email, role, avatar_url),
      support_person:support_person_id (id, full_name, email, role, avatar_url)
    `)
    .eq("goal_id", goalId)
    .order("created_at", { ascending: false });

  return {
    goal: goalData as WeeklyGoal,
    linkedTasks: (tasksData as TaskWithAssignees[]) || [],
  };
}
