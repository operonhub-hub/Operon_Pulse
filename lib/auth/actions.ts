"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth/guards";

export interface AuthActionResult {
  success?: boolean;
  error?: string;
  message?: string;
}

export interface ChangePasswordResult {
  success?: boolean;
  message?: string;
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

/**
 * Server action to change password securely for the currently authenticated active user.
 *
 * Security requirements:
 * 1. Enforces requireActiveUser() server-side (user must be authenticated & active).
 * 2. Does NOT accept user_id, email, or role from the browser.
 * 3. Verifies current password via a temporary isolated client before attempting password update.
 * 4. Enforces validation rules (min 8 chars, mismatch check, new !== current).
 * 5. Updates password via user's active session without forced logout.
 * 6. Never logs passwords or sensitive credentials.
 */
export async function changePasswordAction(
  prevState: ChangePasswordResult | null,
  formData: FormData
): Promise<ChangePasswordResult> {
  try {
    const authResult = await requireActiveUser();
    if (authResult.error || !authResult.data) {
      return { error: authResult.error || "Authentication required. Please sign in." };
    }

    const { supabase, user } = authResult.data;

    const currentPassword = (formData.get("currentPassword") as string) || "";
    const newPassword = (formData.get("newPassword") as string) || "";
    const confirmPassword = (formData.get("confirmPassword") as string) || "";

    // 1. Basic presence checks
    if (!currentPassword) {
      return { error: "Please enter your current password." };
    }

    if (!newPassword) {
      return { error: "Please enter a new password." };
    }

    // 2. Length checks
    if (newPassword.length < 8) {
      return { error: "New password must be at least 8 characters." };
    }

    if (newPassword.length > 72) {
      return { error: "New password cannot exceed 72 characters." };
    }

    // 3. Confirmation match check
    if (newPassword !== confirmPassword) {
      return { error: "New passwords do not match." };
    }

    // 4. Same as current password check
    if (currentPassword === newPassword) {
      return { error: "Your new password must be different from your current password." };
    }

    // 5. Current password verification via isolated temporary client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return { error: "Supabase authentication service is not configured." };
    }

    const verifyClient = createSupabaseJsClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { error: verifyError } = await verifyClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) {
      return { error: "Current password is incorrect." };
    }

    // 6. Update user's password using the active authenticated session client
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return { error: updateError.message || "Failed to update password." };
    }

    revalidatePath("/settings");
    revalidatePath("/", "layout");

    return {
      success: true,
      message: "Password changed successfully.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { error: message };
  }
}
