import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMondayDateString } from "@/lib/utils/date";
import { getTeamBoardTasks, getTeamMembersList } from "@/lib/tasks/queries";
import { getGoalsForWeek } from "@/lib/goals/queries";
import { TeamBoardView } from "@/components/board/team-board-view";
import { Profile } from "@/types";

export const dynamic = "force-dynamic";

interface TeamBoardPageProps {
  searchParams: Promise<{
    week?: string;
  }>;
}

export default async function TeamBoardPage({ searchParams }: TeamBoardPageProps) {
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

  // Fetch all team tasks, team members, and weekly goals for selected week concurrently
  const [tasks, teamMembers, goals] = await Promise.all([
    getTeamBoardTasks(selectedWeek),
    getTeamMembersList(),
    getGoalsForWeek(selectedWeek),
  ]);

  return (
    <TeamBoardView
      initialTasks={tasks}
      currentWeekStart={selectedWeek}
      currentUser={currentUserProfile}
      teamMembers={teamMembers}
      availableGoals={goals}
    />
  );
}
