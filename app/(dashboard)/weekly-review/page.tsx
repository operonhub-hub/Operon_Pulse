import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMondayDateString, getNextMondayDateString } from "@/lib/utils/date";
import { getWeeklyReviewData } from "@/lib/reviews/queries";
import { getGoalsForWeek } from "@/lib/goals/queries";
import { WeeklyReviewView } from "@/components/reviews/weekly-review-view";
import { Profile } from "@/types";

export const dynamic = "force-dynamic";

interface WeeklyReviewPageProps {
  searchParams: Promise<{
    week?: string;
  }>;
}

export default async function WeeklyReviewPage({
  searchParams,
}: WeeklyReviewPageProps) {
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

  const nextWeekStart = getNextMondayDateString(selectedWeek);

  // Fetch aggregated weekly review data and next week's company goals concurrently
  const [reviewData, nextWeekGoals] = await Promise.all([
    getWeeklyReviewData(selectedWeek, user.id),
    getGoalsForWeek(nextWeekStart),
  ]);

  return (
    <WeeklyReviewView
      currentWeekStart={selectedWeek}
      nextWeekStart={nextWeekStart}
      currentUser={currentUserProfile}
      teamMembers={reviewData.teamMembers}
      initialIncompleteTasks={reviewData.incompleteTasks}
      nextWeekGoals={nextWeekGoals}
      initialUserCheckin={reviewData.userCheckin}
      initialTeamCheckins={reviewData.teamCheckins}
      initialSummary={reviewData.summary}
    />
  );
}
