import { createClient } from "@/lib/supabase/server";
import { TaskWithAssignees, Profile } from "@/types";

/**
 * Retrieves tasks for a specific week_start date (YYYY-MM-DD).
 * Joins owner, created_by, support_person, and goal details.
 */
export async function getTasksForWeek(
  weekStart: string,
  filterOwnerId?: string
): Promise<TaskWithAssignees[]> {
  const supabase = await createClient();

  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("tasks")
    .select(`
      *,
      owner:owner_id (id, full_name, email, role, avatar_url),
      created_by_profile:created_by (id, full_name, email, role, avatar_url),
      support_person:support_person_id (id, full_name, email, role, avatar_url),
      goal:goal_id (id, title, status, week_start)
    `)
    .eq("week_start", weekStart)
    .order("created_at", { ascending: false });

  if (filterOwnerId) {
    query = query.eq("owner_id", filterOwnerId);
  }

  const { data, error } = await query;

  if (error) {
    // If goal relationship fails (e.g. migration pending), fall back to basic query
    const fallbackQuery = supabase
      .from("tasks")
      .select(`
        *,
        owner:owner_id (id, full_name, email, role, avatar_url),
        created_by_profile:created_by (id, full_name, email, role, avatar_url),
        support_person:support_person_id (id, full_name, email, role, avatar_url)
      `)
      .eq("week_start", weekStart)
      .order("created_at", { ascending: false });

    const { data: fallbackData } = await fallbackQuery;
    return (fallbackData as TaskWithAssignees[]) || [];
  }

  return (data as TaskWithAssignees[]) || [];
}

/**
 * Retrieves all team tasks for the shared Team Board for a specific week_start date.
 */
export async function getTeamBoardTasks(weekStart: string): Promise<TaskWithAssignees[]> {
  return getTasksForWeek(weekStart);
}

/**
 * Retrieves team members list for task owner and support person dropdowns.
 */
export async function getTeamMembersList(): Promise<Profile[]> {
  const supabase = await createClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, avatar_url, created_at, updated_at")
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as Profile[];
}
