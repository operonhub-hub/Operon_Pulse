import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserSession } from "@/lib/auth/session";
import { Profile } from "@/types";
import { TeamView } from "@/components/team/team-view";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = await getCurrentUserSession();
  const supabase = await createClient();

  if (!supabase || !session.user) {
    redirect("/login");
  }

  const isAdmin = session.profile?.role === "ADMIN" || session.displayUser.role === "ADMIN";

  let teamProfiles: Profile[] = [];

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });

  if (data && data.length > 0) {
    teamProfiles = data as Profile[];
  } else if (session.profile) {
    teamProfiles = [session.profile as Profile];
  }

  return <TeamView initialMembers={teamProfiles} isAdmin={isAdmin} />;
}
