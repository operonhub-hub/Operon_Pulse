import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMondayDateString } from "@/lib/utils/date";
import { getGoalsWithTaskSummary } from "@/lib/goals/queries";
import { getTeamMembersList } from "@/lib/tasks/queries";
import { GoalsView } from "@/components/goals/goals-view";
import { Profile } from "@/types";

export const dynamic = "force-dynamic";

interface GoalsPageProps {
  searchParams: Promise<{
    week?: string;
  }>;
}

export default async function GoalsPage({ searchParams }: GoalsPageProps) {
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

  // Fetch profile
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

  // Parse week from searchParams
  const resolvedSearchParams = await searchParams;
  const requestedWeek = resolvedSearchParams?.week;
  const selectedWeek =
    requestedWeek && /^\d{4}-\d{2}-\d{2}$/.test(requestedWeek)
      ? requestedWeek
      : getMondayDateString();

  // Fetch goals with task summaries & team members concurrently
  const [{ goals, allWeekTasks }, teamMembers] = await Promise.all([
    getGoalsWithTaskSummary(selectedWeek),
    getTeamMembersList(),
  ]);

  return (
    <GoalsView
      initialGoals={goals}
      allWeekTasks={allWeekTasks}
      currentWeekStart={selectedWeek}
      currentUser={currentUserProfile}
      teamMembers={teamMembers}
    />
  );
}
