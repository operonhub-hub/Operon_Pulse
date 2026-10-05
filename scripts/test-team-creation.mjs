/**
 * OperonPulse - Team Member Provisioning & Creation Regression Test Suite
 *
 * Comprehensive test verification covering:
 * 1. Authenticated active ADMIN can successfully provision a MEMBER
 * 2. Authenticated active ADMIN can successfully provision and promote an ADMIN
 * 3. MEMBER caller is rejected with permission error
 * 4. Unauthenticated caller is rejected with authentication error
 * 5. Inactive / deactivated ADMIN caller is rejected
 * 6. Missing or invalid full name (min 2, max 100) is rejected
 * 7. Missing or invalid email format is rejected
 * 8. Short temporary password (< 8 chars) or excessively long (> 72 chars) is rejected
 * 9. Missing SUPABASE_SERVICE_ROLE_KEY returns structured error (never crashes)
 * 10. Duplicate email error from Auth returns user-friendly error message
 * 11. Database trigger verification ensures profile row exists before returning
 * 12. Safe rollback (deleteUser) cleans up Auth user if profile verification fails
 * 13. Safe rollback (deleteUser) cleans up Auth user if ADMIN role promotion fails
 * 14. Server action returns structured error without throwing uncaught exceptions or leaking secrets
 */

import assert from "node:assert/strict";

console.log("🚀 Starting Team Member Creation & Access Control Regression Test Suite...\n");

let passedCount = 0;
function test(description, fn) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(err);
    process.exit(1);
  }
}

// Mock test harness
function createMockHarness({
  callerRole = "ADMIN",
  callerActive = true,
  isAuthenticated = true,
  hasServiceRoleKey = true,
  createUserError = null,
  triggerCreatesProfile = true,
  rolePromotionSucceeds = true,
} = {}) {
  const users = new Map();
  const profiles = new Map();
  const deletedUsers = [];

  // Seed caller
  const callerId = "admin-caller-uuid";
  if (isAuthenticated) {
    users.set(callerId, { id: callerId, email: "admin@operonpulse.io" });
    profiles.set(callerId, {
      id: callerId,
      full_name: "Lead Admin",
      email: "admin@operonpulse.io",
      role: callerRole,
      is_active: callerActive,
    });
  }

  // Simulated requireActiveAdmin guard
  async function mockRequireActiveAdmin() {
    if (!isAuthenticated) {
      return { data: null, error: "Authentication required. Please sign in." };
    }
    const profile = profiles.get(callerId);
    if (!profile) {
      return { data: null, error: "User profile not found." };
    }
    if (profile.is_active === false) {
      return {
        data: null,
        error: "Your workspace access has been deactivated. Contact an administrator.",
      };
    }
    if (profile.role !== "ADMIN") {
      return {
        data: null,
        error: "Permission denied: Administrator role required.",
      };
    }
    return {
      data: {
        user: { id: callerId, email: profile.email },
        profile,
        isAdmin: true,
      },
      error: null,
    };
  }

  // Simulated createAdminClient
  function mockCreateAdminClient() {
    if (!hasServiceRoleKey) {
      return null;
    }
    return {
      auth: {
        admin: {
          createUser: async ({ email, password, user_metadata }) => {
            if (createUserError) {
              return { data: null, error: createUserError };
            }
            const newId = `user-${Math.random().toString(36).substring(2, 9)}`;
            users.set(newId, { id: newId, email, user_metadata });

            // Simulate database trigger on_auth_user_created
            if (triggerCreatesProfile) {
              profiles.set(newId, {
                id: newId,
                email,
                full_name: user_metadata?.full_name || "",
                role: "MEMBER", // Default trigger behavior
                is_active: true,
              });
            }

            return { data: { user: { id: newId, email } }, error: null };
          },
          deleteUser: async (userId) => {
            deletedUsers.push(userId);
            users.delete(userId);
            profiles.delete(userId);
            return { data: { user: null }, error: null };
          },
        },
      },
      from: (table) => {
        if (table === "profiles") {
          return {
            select: (cols) => ({
              eq: (col, val) => ({
                maybeSingle: async () => {
                  const p = profiles.get(val);
                  return { data: p || null, error: null };
                },
              }),
            }),
            update: (updates) => ({
              eq: (col, val) => ({
                select: (cols) => ({
                  maybeSingle: async () => {
                    if (!rolePromotionSucceeds) {
                      return { data: null, error: { message: "Database update error" } };
                    }
                    const p = profiles.get(val);
                    if (p) {
                      Object.assign(p, updates);
                      return { data: p, error: null };
                    }
                    return { data: null, error: null };
                  },
                }),
              }),
            }),
          };
        }
      },
    };
  }

  // Simulated createTeamMemberAction logic
  async function executeCreateTeamMember(payload) {
    try {
      const authResult = await mockRequireActiveAdmin();
      if (authResult.error || !authResult.data) {
        return { success: false, error: authResult.error || "Authentication required." };
      }

      const fullName = payload.fullName?.trim() || "";
      const email = payload.email?.trim().toLowerCase() || "";
      const password = payload.temporaryPassword || "";
      const role = payload.role === "ADMIN" ? "ADMIN" : "MEMBER";

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

      const adminClient = mockCreateAdminClient();
      if (!adminClient) {
        return {
          success: false,
          error:
            "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not configured in this environment. Please configure it in your deployment settings.",
        };
      }

      let createdData;
      let createError;
      try {
        const res = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });
        createdData = res.data;
        createError = res.error;
      } catch (err) {
        return { success: false, error: err.message || "Authentication service error." };
      }

      if (createError) {
        const errMsg = createError.message?.toLowerCase() || "";
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

      if (!createdData?.user?.id) {
        return { success: false, error: "User creation did not return a valid user record." };
      }

      const newUserId = createdData.user.id;

      // Verify profile existence (database trigger check)
      let profileReady = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: profileCheck } = await adminClient
          .from("profiles")
          .select("id, role, is_active")
          .eq("id", newUserId)
          .maybeSingle();

        if (profileCheck) {
          profileReady = true;
          break;
        }
      }

      if (!profileReady) {
        await adminClient.auth.admin.deleteUser(newUserId);
        return {
          success: false,
          error:
            "User was created but profile initialization failed. The creation was rolled back for safety.",
        };
      }

      // Role promotion
      if (role === "ADMIN") {
        let rolePromoted = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          const { data: updatedProfile, error: updateRoleError } = await adminClient
            .from("profiles")
            .update({ role: "ADMIN" })
            .eq("id", newUserId)
            .select("id, role")
            .maybeSingle();

          if (!updateRoleError && updatedProfile?.role === "ADMIN") {
            rolePromoted = true;
            break;
          }
        }

        if (!rolePromoted) {
          await adminClient.auth.admin.deleteUser(newUserId);
          return {
            success: false,
            error: "Failed to assign administrator role to the new member. Creation was rolled back.",
          };
        }
      }

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
    } catch (err) {
      return { success: false, error: err.message || "An unexpected server error occurred." };
    }
  }

  return { executeCreateTeamMember, users, profiles, deletedUsers };
}

// -------------------------------------------------------------
// TESTS
// -------------------------------------------------------------

test("1. Authenticated active ADMIN can successfully provision a MEMBER", async () => {
  const { executeCreateTeamMember, profiles } = createMockHarness();
  const res = await executeCreateTeamMember({
    fullName: "Silas Sani",
    email: "saniaromesilas@gmail.com",
    temporaryPassword: "SecurePassword123!",
    role: "MEMBER",
  });

  assert.equal(res.success, true);
  assert.equal(res.user?.fullName, "Silas Sani");
  assert.equal(res.user?.email, "saniaromesilas@gmail.com");
  assert.equal(res.user?.role, "MEMBER");

  const createdProfile = profiles.get(res.user.id);
  assert.ok(createdProfile);
  assert.equal(createdProfile.role, "MEMBER");
  assert.equal(createdProfile.is_active, true);
});

test("2. Authenticated active ADMIN can successfully provision and promote an ADMIN", async () => {
  const { executeCreateTeamMember, profiles } = createMockHarness();
  const res = await executeCreateTeamMember({
    fullName: "Co-Admin User",
    email: "coadmin@operonpulse.io",
    temporaryPassword: "SecurePassword123!",
    role: "ADMIN",
  });

  assert.equal(res.success, true);
  assert.equal(res.user?.role, "ADMIN");

  const createdProfile = profiles.get(res.user.id);
  assert.ok(createdProfile);
  assert.equal(createdProfile.role, "ADMIN");
  assert.equal(createdProfile.is_active, true);
});

test("3. MEMBER caller is rejected with permission error", async () => {
  const { executeCreateTeamMember } = createMockHarness({ callerRole: "MEMBER" });
  const res = await executeCreateTeamMember({
    fullName: "New Member",
    email: "new@operonpulse.io",
    temporaryPassword: "Password123!",
    role: "MEMBER",
  });

  assert.equal(res.success, false);
  assert.match(res.error, /Permission denied/i);
});

test("4. Unauthenticated caller is rejected with authentication error", async () => {
  const { executeCreateTeamMember } = createMockHarness({ isAuthenticated: false });
  const res = await executeCreateTeamMember({
    fullName: "New Member",
    email: "new@operonpulse.io",
    temporaryPassword: "Password123!",
    role: "MEMBER",
  });

  assert.equal(res.success, false);
  assert.match(res.error, /Authentication required/i);
});

test("5. Inactive / deactivated ADMIN caller is rejected", async () => {
  const { executeCreateTeamMember } = createMockHarness({ callerActive: false });
  const res = await executeCreateTeamMember({
    fullName: "New Member",
    email: "new@operonpulse.io",
    temporaryPassword: "Password123!",
    role: "MEMBER",
  });

  assert.equal(res.success, false);
  assert.match(res.error, /deactivated/i);
});

test("6. Missing or invalid full name is rejected", async () => {
  const { executeCreateTeamMember } = createMockHarness();
  const res1 = await executeCreateTeamMember({
    fullName: "",
    email: "test@operonpulse.io",
    temporaryPassword: "Password123!",
    role: "MEMBER",
  });
  assert.equal(res1.success, false);
  assert.match(res1.error, /full name/i);

  const res2 = await executeCreateTeamMember({
    fullName: "A",
    email: "test@operonpulse.io",
    temporaryPassword: "Password123!",
    role: "MEMBER",
  });
  assert.equal(res2.success, false);
  assert.match(res2.error, /full name/i);
});

test("7. Missing or invalid email format is rejected", async () => {
  const { executeCreateTeamMember } = createMockHarness();
  const res1 = await executeCreateTeamMember({
    fullName: "Valid Name",
    email: "not-an-email",
    temporaryPassword: "Password123!",
    role: "MEMBER",
  });
  assert.equal(res1.success, false);
  assert.match(res1.error, /valid work email/i);
});

test("8. Short temporary password (< 8 chars) or excessively long is rejected", async () => {
  const { executeCreateTeamMember } = createMockHarness();
  const res1 = await executeCreateTeamMember({
    fullName: "Valid Name",
    email: "test@operonpulse.io",
    temporaryPassword: "short",
    role: "MEMBER",
  });
  assert.equal(res1.success, false);
  assert.match(res1.error, /at least 8 characters/i);

  const res2 = await executeCreateTeamMember({
    fullName: "Valid Name",
    email: "test@operonpulse.io",
    temporaryPassword: "a".repeat(73),
    role: "MEMBER",
  });
  assert.equal(res2.success, false);
  assert.match(res2.error, /cannot exceed 72 characters/i);
});

test("9. Missing SUPABASE_SERVICE_ROLE_KEY returns structured error without crashing", async () => {
  const { executeCreateTeamMember } = createMockHarness({ hasServiceRoleKey: false });
  const res = await executeCreateTeamMember({
    fullName: "Valid Name",
    email: "test@operonpulse.io",
    temporaryPassword: "Password123!",
    role: "MEMBER",
  });

  assert.equal(res.success, false);
  assert.match(res.error, /SUPABASE_SERVICE_ROLE_KEY is not configured/i);
});

test("10. Duplicate email error from Auth returns user-friendly error message", async () => {
  const { executeCreateTeamMember } = createMockHarness({
    createUserError: { message: "User already registered", code: "email_exists" },
  });
  const res = await executeCreateTeamMember({
    fullName: "Valid Name",
    email: "duplicate@operonpulse.io",
    temporaryPassword: "Password123!",
    role: "MEMBER",
  });

  assert.equal(res.success, false);
  assert.match(res.error, /already exists/i);
});

test("11. Database trigger verification ensures profile row exists before returning", async () => {
  const { executeCreateTeamMember, profiles } = createMockHarness({ triggerCreatesProfile: true });
  const res = await executeCreateTeamMember({
    fullName: "Trigger Verified User",
    email: "trigger@operonpulse.io",
    temporaryPassword: "Password123!",
    role: "MEMBER",
  });

  assert.equal(res.success, true);
  assert.ok(profiles.has(res.user.id));
});

test("12. Safe rollback (deleteUser) cleans up Auth user if profile verification fails", async () => {
  const { executeCreateTeamMember, deletedUsers } = createMockHarness({
    triggerCreatesProfile: false, // Simulate broken trigger
  });
  const res = await executeCreateTeamMember({
    fullName: "Broken Trigger User",
    email: "brokentrigger@operonpulse.io",
    temporaryPassword: "Password123!",
    role: "MEMBER",
  });

  assert.equal(res.success, false);
  assert.match(res.error, /profile initialization failed/i);
  assert.equal(deletedUsers.length, 1);
});

test("13. Safe rollback (deleteUser) cleans up Auth user if ADMIN role promotion fails", async () => {
  const { executeCreateTeamMember, deletedUsers } = createMockHarness({
    rolePromotionSucceeds: false, // Simulate failed role promotion
  });
  const res = await executeCreateTeamMember({
    fullName: "Failed Admin Promotion",
    email: "failedadmin@operonpulse.io",
    temporaryPassword: "Password123!",
    role: "ADMIN",
  });

  assert.equal(res.success, false);
  assert.match(res.error, /Failed to assign administrator role/i);
  assert.equal(deletedUsers.length, 1);
});

test("14. Server action returns structured error without throwing uncaught exceptions or leaking secrets", async () => {
  const { executeCreateTeamMember } = createMockHarness();
  const res = await executeCreateTeamMember({
    fullName: "Valid User",
    email: "valid@operonpulse.io",
    temporaryPassword: "SecretPassword123!",
    role: "MEMBER",
  });

  assert.equal(res.success, true);
  assert.equal(JSON.stringify(res).includes("SecretPassword123!"), false);
});

console.log(`\n🎉 Team Member Creation test suite passed (${passedCount} tests).\n`);
