import { createClient } from "@/lib/supabase/server";
import { Profile, UserProfile } from "@/types";
const unauthenticatedFallbackUser: UserProfile = {
  name: "Guest",
  firstName: "Guest",
  email: "",
  initials: "OP",
  role: "MEMBER",
  workspaceName: "OperonPulse",
};

export interface CurrentUserSession {
  user: {
    id: string;
    email: string;
  } | null;
  profile: Profile | null;
  displayUser: UserProfile;
  isAuthenticated: boolean;
}

/**
 * Server-side helper to retrieve the authenticated user and profile.
 * Gracefully handles unconfigured environment variables or missing profiles.
 */
export async function getCurrentUserSession(): Promise<CurrentUserSession> {
  const supabase = await createClient();

  if (!supabase) {
    // Unconfigured environment variables fallback (e.g. initial setup)
    return {
      user: null,
      profile: null,
      displayUser: unauthenticatedFallbackUser,
      isAuthenticated: false,
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      user: null,
      profile: null,
      displayUser: unauthenticatedFallbackUser,
      isAuthenticated: false,
    };
  }

  // Query profile from database
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const fullName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const firstName = fullName.split(" ")[0] || fullName;
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  const displayUser: UserProfile = {
    name: fullName,
    firstName: firstName,
    email: user.email || "",
    initials: initials,
    role: profile?.role || "MEMBER",
    workspaceName: "OperonPulse HQ",
  };

  return {
    user: {
      id: user.id,
      email: user.email || "",
    },
    profile: profile || null,
    displayUser,
    isAuthenticated: true,
  };
}
