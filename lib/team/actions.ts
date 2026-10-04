"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserRole } from "@/types";

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

/**
 * Server action for workspace ADMINs to create new team members directly.
 *
 * Security guarantees:
 * - Strictly checks that the caller is an authenticated user with ADMIN role.
 * - Uses the server-only Supabase Admin client with service role credentials.
 * - Never logs or persists the temporary password.
 * - Handles duplicate emails with clean user-facing error messages.
 */
export async function createTeamMemberAction(
  payload: CreateTeamMemberPayload
): Promise<CreateTeamMemberResult> {
  try {
    // 1. Authenticate caller using session client
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: "Database client is unavailable." };
    }

    const {
      data: { user: callerUser },
    } = await supabase.auth.getUser();

    if (!callerUser) {
      return { success: false, error: "Authentication required. Please sign in." };
    }

    // 2. Verify caller has ADMIN role in profiles
    const { data: callerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", callerUser.id)
      .single();

    if (profileError || callerProfile?.role !== "ADMIN") {
      return {
        success: false,
        error: "Permission denied: Only workspace administrators can add team members.",
      };
    }

    // 3. Validate input payload
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

    // 4. Initialize privileged server-only admin client
    const adminClient = createAdminClient();
    if (!adminClient) {
      return {
        success: false,
        error:
          "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not configured. Please contact the administrator.",
      };
    }

    // 5. Create Auth user via Supabase Admin Auth API
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

    // 6. Role promotion if ADMIN was requested (on_auth_user_created trigger defaults to MEMBER)
    if (role === "ADMIN") {
      // Small sleep to ensure the trigger created the profile row
      const { error: updateRoleError } = await adminClient
        .from("profiles")
        .update({ role: "ADMIN", updated_at: new Date().toISOString() })
        .eq("id", newUserId);

      if (updateRoleError) {
        // Roll back the created auth user on role assignment failure
        await adminClient.auth.admin.deleteUser(newUserId);
        return {
          success: false,
          error: "Failed to assign administrator role to the new member. Creation rolled back.",
        };
      }
    }

    // 7. Revalidate dashboard & team routes
    revalidatePath("/team");
    revalidatePath("/dashboard");
    revalidatePath("/insights");
    revalidatePath("/my-tasks");
    revalidatePath("/team-board");

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
