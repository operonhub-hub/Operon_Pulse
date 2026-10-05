"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveAdmin } from "@/lib/auth/guards";
import { UserRole } from "@/types";
import { DEACTIVATION_BAN_DURATION, REACTIVATION_UNBAN_DURATION } from "./constants";

export { DEACTIVATION_BAN_DURATION, REACTIVATION_UNBAN_DURATION };

export interface CreateTeamMemberPayload {
  fullName: string;
  email: string;
  temporaryPassword: string;
  role: UserRole;
}

export interface CreateTeamMemberResult {
  success: boolean;
  message?: string;
  error?: string;
  user?: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
  };
}

export interface DeactivateTeamMemberResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ReactivateTeamMemberResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Server action for workspace ADMINs to create new team members directly.
 */
export async function createTeamMemberAction(
  payload: CreateTeamMemberPayload
): Promise<CreateTeamMemberResult> {
  try {
    const authResult = await requireActiveAdmin();
    if (authResult.error || !authResult.data) {
      return { success: false, error: authResult.error || "Authentication required." };
    }

    // Validate input payload
    const fullName = payload.fullName?.trim() || "";
    const email = payload.email?.trim().toLowerCase() || "";
    const password = payload.temporaryPassword || "";
    const role: UserRole = payload.role === "ADMIN" ? "ADMIN" : "MEMBER";

    if (!fullName || fullName.length < 2 || fullName.length > 100) {
      return { success: false, error: "Please provide a valid full name (2–100 characters)." };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { success: false, error: "Please provide a valid work email address." };
    }

    if (!password || password.length < 8) {
      return { success: false, error: "Temporary password must be at least 8 characters long." };
    }

    if (password.length > 72) {
      return { success: false, error: "Temporary password cannot exceed 72 characters." };
    }

    // Initialize privileged server-only admin client
    const adminClient = createAdminClient();
    if (!adminClient) {
      return {
        success: false,
        error:
          "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not configured. Please contact the administrator.",
      };
    }

    // Create Auth user via Supabase Admin Auth API
    const { data: createdData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatically confirm email for internal administrator provisioning
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError) {
      const errMsg = createError.message.toLowerCase();
      if (
        errMsg.includes("already registered") ||
        errMsg.includes("already exists") ||
        errMsg.includes("duplicate") ||
        createError.code === "email_exists"
      ) {
        return { success: false, error: "A team member with this email already exists." };
      }
      return { success: false, error: createError.message || "Failed to create user account." };
    }

    if (!createdData?.user) {
      return { success: false, error: "User creation did not return a valid user record." };
    }

    const newUserId = createdData.user.id;

    // Role promotion if ADMIN was requested
    if (role === "ADMIN") {
      const { error: updateRoleError } = await adminClient
        .from("profiles")
        .update({ role: "ADMIN", updated_at: new Date().toISOString() })
        .eq("id", newUserId);

      if (updateRoleError) {
        await adminClient.auth.admin.deleteUser(newUserId);
        return {
          success: false,
          error: "Failed to assign administrator role to the new member. Creation rolled back.",
        };
      }
    }

    // Revalidate dashboard & team routes
    revalidatePath("/team");
    revalidatePath("/dashboard");
    revalidatePath("/insights");
    revalidatePath("/my-tasks");
    revalidatePath("/team-board");
    revalidatePath("/goals");
    revalidatePath("/weekly-review");

    return {
      success: true,
      message: `${fullName} has been added to OperonPulse as ${role}.`,
      user: {
        id: newUserId,
        email,
        fullName,
        role,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return { success: false, error: message };
  }
}

/**
 * Server action for workspace ADMINs to safely deactivate a team member.
 *
 * Security guarantees:
 * - Uses shared requireActiveAdmin() guard.
 * - Prevents self-deactivation.
 * - Prevents deactivating the last active workspace administrator.
 * - Marks public.profiles.is_active = false.
 * - Suspends Supabase Auth account using ban_duration: DEACTIVATION_BAN_DURATION.
 * - Employs rollback on partial failure.
 * - Preserves all historical records.
 */
export async function deactivateTeamMemberAction(
  memberId: string
): Promise<DeactivateTeamMemberResult> {
  try {
    if (!memberId || typeof memberId !== "string" || !memberId.trim()) {
      return { success: false, error: "A valid team member ID is required." };
    }

    const authResult = await requireActiveAdmin();
    if (authResult.error || !authResult.data) {
      return { success: false, error: authResult.error || "Authentication required." };
    }

    const callerId = authResult.data.user.id;

    // Prevent self-deactivation
    if (callerId === memberId) {
      return {
        success: false,
        error: "You cannot deactivate your own administrator account.",
      };
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      return {
        success: false,
        error:
          "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not configured. Please contact the administrator.",
      };
    }

    // Check target profile
    const { data: targetProfile, error: targetError } = await adminClient
      .from("profiles")
      .select("id, full_name, email, role, is_active")
      .eq("id", memberId)
      .maybeSingle();

    if (targetError || !targetProfile) {
      return { success: false, error: "Team member not found." };
    }

    const displayName = targetProfile.full_name || targetProfile.email;

    // Idempotent check
    if (targetProfile.is_active === false) {
      return {
        success: true,
        message: `${displayName} is already inactive.`,
      };
    }

    // If target is ADMIN, verify they are not the last active administrator
    if (targetProfile.role === "ADMIN") {
      const { data: otherActiveAdmins, error: countError } = await adminClient
        .from("profiles")
        .select("id")
        .eq("role", "ADMIN")
        .eq("is_active", true)
        .neq("id", memberId);

      if (countError || !otherActiveAdmins || otherActiveAdmins.length === 0) {
        return {
          success: false,
          error: "Cannot deactivate the last active workspace administrator.",
        };
      }
    }

    // 1. Update profiles table: is_active = false
    const { error: updateProfileError } = await adminClient
      .from("profiles")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId);

    if (updateProfileError) {
      return {
        success: false,
        error: updateProfileError.message || "Failed to update profile status.",
      };
    }

    // 2. Suspend user in Supabase Auth (100-year ban duration)
    const { error: banError } = await adminClient.auth.admin.updateUserById(memberId, {
      ban_duration: DEACTIVATION_BAN_DURATION,
    });

    if (banError) {
      // Roll back profile update on auth suspension failure
      await adminClient
        .from("profiles")
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", memberId);

      return {
        success: false,
        error: `Failed to suspend workspace account (${banError.message}). Changes were rolled back.`,
      };
    }

    // Revalidate paths
    revalidatePath("/team");
    revalidatePath("/dashboard");
    revalidatePath("/my-tasks");
    revalidatePath("/team-board");
    revalidatePath("/goals");
    revalidatePath("/weekly-review");
    revalidatePath("/insights");

    return {
      success: true,
      message: `${displayName} has been deactivated.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return { success: false, error: message };
  }
}

/**
 * Server action for workspace ADMINs to safely reactivate an inactive team member.
 *
 * Security guarantees:
 * - Uses shared requireActiveAdmin() guard.
 * - Marks public.profiles.is_active = true.
 * - Lifts Supabase Auth account ban using ban_duration: REACTIVATION_UNBAN_DURATION ('none').
 * - Employs rollback on partial failure.
 */
export async function reactivateTeamMemberAction(
  memberId: string
): Promise<ReactivateTeamMemberResult> {
  try {
    if (!memberId || typeof memberId !== "string" || !memberId.trim()) {
      return { success: false, error: "A valid team member ID is required." };
    }

    const authResult = await requireActiveAdmin();
    if (authResult.error || !authResult.data) {
      return { success: false, error: authResult.error || "Authentication required." };
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      return {
        success: false,
        error:
          "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not configured. Please contact the administrator.",
      };
    }

    // Check target profile
    const { data: targetProfile, error: targetError } = await adminClient
      .from("profiles")
      .select("id, full_name, email, role, is_active")
      .eq("id", memberId)
      .maybeSingle();

    if (targetError || !targetProfile) {
      return { success: false, error: "Team member not found." };
    }

    const displayName = targetProfile.full_name || targetProfile.email;

    // Idempotent check
    if (targetProfile.is_active === true) {
      return {
        success: true,
        message: `${displayName} is already active.`,
      };
    }

    // 1. Update profiles table: is_active = true
    const { error: updateProfileError } = await adminClient
      .from("profiles")
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId);

    if (updateProfileError) {
      return {
        success: false,
        error: updateProfileError.message || "Failed to update profile status.",
      };
    }

    // 2. Lift suspension in Supabase Auth (ban_duration: 'none')
    const { error: unbanError } = await adminClient.auth.admin.updateUserById(memberId, {
      ban_duration: REACTIVATION_UNBAN_DURATION,
    });

    if (unbanError) {
      // Roll back profile update on auth unban failure
      await adminClient
        .from("profiles")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", memberId);

      return {
        success: false,
        error: `Failed to restore workspace access (${unbanError.message}). Changes were rolled back.`,
      };
    }

    // Revalidate paths
    revalidatePath("/team");
    revalidatePath("/dashboard");
    revalidatePath("/my-tasks");
    revalidatePath("/team-board");
    revalidatePath("/goals");
    revalidatePath("/weekly-review");
    revalidatePath("/insights");

    return {
      success: true,
      message: `${displayName} has been reactivated.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return { success: false, error: message };
  }
}
