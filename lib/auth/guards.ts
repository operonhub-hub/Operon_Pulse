import { createClient } from "@/lib/supabase/server";
import { Profile } from "@/types";

export interface ActiveUserGuardData {
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>;
  user: {
    id: string;
    email: string;
  };
  profile: Profile;
  isAdmin: boolean;
}

export type GuardResult<T = ActiveUserGuardData> =
  | { data: T; error: null }
  | { data: null; error: string };

/**
 * Shared server guard: Ensures the caller is authenticated and has an active profile (is_active !== false).
 * If the user has been deactivated, immediately signs out their session and returns a clear access error.
 */
export async function requireActiveUser(): Promise<GuardResult> {
  const supabase = await createClient();
  if (!supabase) {
    return { data: null, error: "Database client is unavailable." };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { data: null, error: "Authentication required. Please sign in." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { data: null, error: "User profile not found." };
  }

  if (profile.is_active === false) {
    await supabase.auth.signOut();
    return {
      data: null,
      error: "Your workspace access has been deactivated. Contact an administrator.",
    };
  }

  return {
    data: {
      supabase,
      user: {
        id: user.id,
        email: user.email || "",
      },
      profile: profile as Profile,
      isAdmin: profile.role === "ADMIN",
    },
    error: null,
  };
}

/**
 * Shared server guard: Ensures the caller is authenticated, active, and holds the ADMIN role.
 */
export async function requireActiveAdmin(): Promise<GuardResult> {
  const userResult = await requireActiveUser();
  if (userResult.error || !userResult.data) {
    return { data: null, error: userResult.error || "Authentication required." };
  }

  if (!userResult.data.isAdmin) {
    return {
      data: null,
      error: "Permission denied: Administrator role required.",
    };
  }

  return userResult;
}
