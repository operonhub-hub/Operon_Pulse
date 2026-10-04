import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMondayDateString } from "@/lib/utils/date";
import { getTasksForWeek, getTeamMembersList } from "@/lib/tasks/queries";
import { getGoalsForWeek } from "@/lib/goals/queries";
import { TasksView } from "@/components/tasks/tasks-view";
import { Profile } from "@/types";

export const dynamic = "force-dynamic";

interface MyTasksPageProps {
  searchParams: Promise<{
    week?: string;
  }>;
}

export default async function MyTasksPage({ searchParams }: MyTasksPageProps) {
  const supabase = await createClient();

  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch current user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, avatar_url, created_at, updated_at")
    .eq("id", user.id)
    .single();

  const currentUserProfile: Profile = (profile as Profile) || {
    id: user.id,
    full_name: null,
    email: user.email || "",
    role: "MEMBER",
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Parse target week from searchParams or default to current week's Monday
  const resolvedSearchParams = await searchParams;
  const requestedWeek = resolvedSearchParams?.week;
  const selectedWeek =
    requestedWeek && /^\d{4}-\d{2}-\d{2}$/.test(requestedWeek)
      ? requestedWeek
      : getMondayDateString();

  // Fetch tasks, team members, and weekly goals concurrently
  const [tasks, teamMembers, goals] = await Promise.all([
    getTasksForWeek(selectedWeek),
    getTeamMembersList(),
    getGoalsForWeek(selectedWeek),
  ]);

  return (
    <TasksView
      initialTasks={tasks}
      currentWeekStart={selectedWeek}
      currentUser={currentUserProfile}
      teamMembers={teamMembers}
      availableGoals={goals}
    />
  );
}
