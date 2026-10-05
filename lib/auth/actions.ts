"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth/guards";

export interface AuthActionResult {
  success?: boolean;
  error?: string;
}

/**
 * Server action to log in with email and password
 */
export async function loginAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please provide both email and password." };
  }

  const supabase = await createClient();

  if (!supabase) {
    return {
      error:
        "Supabase credentials are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.",
    };
  }

  try {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      if (error.message.toLowerCase().includes("invalid login credentials")) {
        return { error: "Invalid email or password. Please verify your credentials." };
      }
      if (error.message.toLowerCase().includes("email not confirmed")) {
        return { error: "Your email address has not been confirmed yet." };
      }
      if (
        error.message.toLowerCase().includes("user is banned") ||
        error.message.toLowerCase().includes("banned")
      ) {
        return {
          error: "Your workspace access has been deactivated. Contact an administrator.",
        };
      }
      if (error.message.toLowerCase().includes("fetch failed")) {
        return {
          error:
            "Unable to connect to Supabase authentication service. Please check your network connection.",
        };
      }
      return { error: error.message || "An error occurred during authentication." };
    }

    if (authData?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (profile && profile.is_active === false) {
        await supabase.auth.signOut();
        return {
          error: "Your workspace access has been deactivated. Contact an administrator.",
        };
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes("fetch failed")) {
      return {
        error:
          "Unable to connect to Supabase authentication service. Please check your network connection.",
      };
    }
    return { error: message || "An unexpected error occurred during authentication." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Server action to log out
 */
export async function logoutAction() {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Server action to update user profile (full name only; role is protected)
 */
export async function updateProfileAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const fullName = formData.get("fullName") as string;

  if (!fullName || !fullName.trim()) {
    return { error: "Full name cannot be empty." };
  }

  const authResult = await requireActiveUser();
  if (authResult.error || !authResult.data) {
    return { error: authResult.error || "Authentication required." };
  }

  const { supabase, user } = authResult.data;

  // Update profile record with least-privilege column grant (full_name only)
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName.trim(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message || "Failed to update profile." };
  }

  // Also update auth user metadata for consistency
  await supabase.auth.updateUser({
    data: { full_name: fullName.trim() },
  });

  revalidatePath("/settings");
  revalidatePath("/", "layout");

  return { success: true };
}
