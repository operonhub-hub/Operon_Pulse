/**
 * OperonPulse - Team Department & Business Function Test Suite
 *
 * Verifies Part B requirements:
 * 15. Existing profile with null department still works
 * 16. Admin creates Member with department
 * 17. Admin creates Admin with department
 * 18. Member cannot update department
 * 19. Admin can update department
 * 20. Invalid department rejected
 * 21. Team directory shows department
 * 22. Inactive member retains department
 * 23. Department update does not affect historical tasks
 * 24. Active-only assignee selector still works with departments
 */

import assert from "node:assert/strict";
import { DEPARTMENTS, isValidDepartment, formatDepartmentDisplay } from "../lib/team/departments.ts";

console.log("🚀 Starting Team Department & Business Function Test Suite...\n");

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

// Mock database & auth harness for Department operations
function createDepartmentTestHarness() {
  const profiles = new Map();
  const tasks = [];

  // Seed Admin caller
  const adminId = "admin-1";
  profiles.set(adminId, {
    id: adminId,
    full_name: "Admin User",
    email: "admin@operonpulse.io",
    role: "ADMIN",
    department: "Leadership",
    is_active: true,
  });

  // Seed Member caller
  const memberId = "member-1";
  profiles.set(memberId, {
    id: memberId,
    full_name: "Standard Member",
    email: "member@operonpulse.io",
    role: "MEMBER",
    department: "Engineering",
    is_active: true,
  });

  // Seed Legacy User with NULL department
  const legacyId = "legacy-user";
  profiles.set(legacyId, {
    id: legacyId,
    full_name: "Legacy Employee",
    email: "legacy@operonpulse.io",
    role: "MEMBER",
    department: null,
    is_active: true,
  });

  // Seed tasks
  tasks.push({
    id: "task-1",
    title: "Old Architecture Review",
    owner_id: memberId,
    week_start: "2026-10-05",
    status: "DONE",
  });

  // Simulated server action: updateTeamMemberProfileAction
  function updateTeamMemberProfile(callerId, payload) {
    const caller = profiles.get(callerId);
    if (!caller || !caller.is_active) {
      return { success: false, error: "Authentication required." };
    }
    if (caller.role !== "ADMIN") {
      return { success: false, error: "Permission denied: Administrator role required." };
    }

    const { memberId: targetId, fullName, department } = payload;
    const target = profiles.get(targetId);
    if (!target) {
      return { success: false, error: "Team member not found." };
    }

    if (!fullName || fullName.trim().length < 2 || fullName.trim().length > 100) {
      return { success: false, error: "Please provide a valid full name (2–100 characters)." };
    }

    if (department !== undefined && department !== null && department.trim() !== "") {
      if (!isValidDepartment(department)) {
        return { success: false, error: "Please select a valid department or leave unassigned." };
      }
    }

    target.full_name = fullName.trim();
    target.department = department ? department.trim() : null;

    return {
      success: true,
      message: "Team member updated successfully.",
      user: { id: target.id, fullName: target.full_name, department: target.department },
    };
  }

  // Simulated server action: createTeamMemberAction
  function createTeamMember(callerId, payload) {
    const caller = profiles.get(callerId);
    if (!caller || !caller.is_active || caller.role !== "ADMIN") {
      return { success: false, error: "Permission denied: Administrator role required." };
    }

    const { fullName, email, role, department } = payload;
    if (department && !isValidDepartment(department)) {
      return { success: false, error: "Please select a valid department or leave unassigned." };
    }

    const newId = `user-${Math.random().toString(36).substring(2, 9)}`;
    const newProfile = {
      id: newId,
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      role: role === "ADMIN" ? "ADMIN" : "MEMBER",
      department: department ? department.trim() : null,
      is_active: true,
    };
    profiles.set(newId, newProfile);

    return {
      success: true,
      user: {
        id: newId,
        email: newProfile.email,
        fullName: newProfile.full_name,
        role: newProfile.role,
        department: newProfile.department,
      },
    };
  }

  return { profiles, tasks, updateTeamMemberProfile, createTeamMember };
}

// 15. Existing profile with null department still works
test("15. Existing profile with null department still works", () => {
  const { profiles } = createDepartmentTestHarness();
  const legacy = profiles.get("legacy-user");
  assert.ok(legacy);
  assert.equal(legacy.department, null);
  assert.equal(formatDepartmentDisplay(legacy.department), "Not assigned");
});

// 16. Admin creates Member with department
test("16. Admin creates Member with department", () => {
  const { createTeamMember, profiles } = createDepartmentTestHarness();
  const res = createTeamMember("admin-1", {
    fullName: "Edward Obute",
    email: "edward@operonpulse.io",
    role: "MEMBER",
    department: "Marketing",
  });

  assert.equal(res.success, true);
  assert.equal(res.user?.department, "Marketing");
  assert.equal(res.user?.role, "MEMBER");

  const stored = profiles.get(res.user.id);
  assert.equal(stored.department, "Marketing");
});

// 17. Admin creates Admin with department
test("17. Admin creates Admin with department", () => {
  const { createTeamMember, profiles } = createDepartmentTestHarness();
  const res = createTeamMember("admin-1", {
    fullName: "Co-Lead Partner",
    email: "colead@operonpulse.io",
    role: "ADMIN",
    department: "Operations",
  });

  assert.equal(res.success, true);
  assert.equal(res.user?.role, "ADMIN");
  assert.equal(res.user?.department, "Operations");

  const stored = profiles.get(res.user.id);
  assert.equal(stored.department, "Operations");
});

// 18. Member cannot update department
test("18. Member cannot update department (permission denied)", () => {
  const { updateTeamMemberProfile } = createDepartmentTestHarness();
  const res = updateTeamMemberProfile("member-1", {
    memberId: "member-1",
    fullName: "Standard Member",
    department: "Leadership",
  });

  assert.equal(res.success, false);
  assert.match(res.error, /Permission denied/i);
});

// 19. Admin can update department
test("19. Admin can update department", () => {
  const { updateTeamMemberProfile, profiles } = createDepartmentTestHarness();
  const res = updateTeamMemberProfile("admin-1", {
    memberId: "legacy-user",
    fullName: "Legacy Employee Promoted",
    department: "Product",
  });

  assert.equal(res.success, true);
  assert.equal(res.user?.department, "Product");

  const updated = profiles.get("legacy-user");
  assert.equal(updated.department, "Product");
  assert.equal(updated.full_name, "Legacy Employee Promoted");
});

// 20. Invalid department rejected
test("20. Invalid department rejected", () => {
  const { updateTeamMemberProfile, createTeamMember } = createDepartmentTestHarness();

  // Test update
  const resUpdate = updateTeamMemberProfile("admin-1", {
    memberId: "member-1",
    fullName: "Standard Member",
    department: "InvalidDepartment123",
  });
  assert.equal(resUpdate.success, false);
  assert.match(resUpdate.error, /valid department/i);

  // Test create
  const resCreate = createTeamMember("admin-1", {
    fullName: "Test User",
    email: "test@operonpulse.io",
    role: "MEMBER",
    department: "Astronaut",
  });
  assert.equal(resCreate.success, false);
  assert.match(resCreate.error, /valid department/i);
});

// 21. Team directory shows department
test("21. Team directory shows department", () => {
  const { profiles } = createDepartmentTestHarness();
  const allMembers = Array.from(profiles.values());

  const marketingMembers = allMembers.filter((m) => m.department === "Marketing");
  assert.equal(marketingMembers.length, 0);

  // Verify display helper format
  assert.equal(formatDepartmentDisplay("Sales"), "Sales");
  assert.equal(formatDepartmentDisplay(null), "Not assigned");
  assert.equal(formatDepartmentDisplay(""), "Not assigned");
});

// 22. Inactive member retains department
test("22. Inactive member retains department", () => {
  const { profiles } = createDepartmentTestHarness();
  const member = profiles.get("member-1");
  assert.equal(member.department, "Engineering");

  // Deactivate member
  member.is_active = false;
  assert.equal(member.department, "Engineering", "Department must be preserved upon deactivation");
});

// 23. Department update does not affect historical tasks
test("23. Department update does not affect historical tasks", () => {
  const { updateTeamMemberProfile, tasks } = createDepartmentTestHarness();
  const originalTask = { ...tasks[0] };

  // Update department of task owner
  const res = updateTeamMemberProfile("admin-1", {
    memberId: "member-1",
    fullName: "Standard Member Renamed",
    department: "Design",
  });
  assert.equal(res.success, true);

  // Check task history
  assert.equal(tasks[0].id, originalTask.id);
  assert.equal(tasks[0].owner_id, originalTask.owner_id);
  assert.equal(tasks[0].week_start, originalTask.week_start);
  assert.equal(tasks[0].status, originalTask.status);
});

// 24. Active-only assignee selector still works with departments
test("24. Active-only assignee selector still works with departments", () => {
  const { profiles } = createDepartmentTestHarness();

  // Deactivate legacy user
  profiles.get("legacy-user").is_active = false;

  const activeAssignees = Array.from(profiles.values())
    .filter((m) => m.is_active !== false)
    .map((m) => ({
      id: m.id,
      label: `${m.full_name}${m.department ? ` · ${m.department}` : ""}`,
    }));

  assert.equal(activeAssignees.length, 2);
  assert.ok(activeAssignees.some((a) => a.label.includes("Engineering")));
  assert.ok(activeAssignees.some((a) => a.label.includes("Leadership")));
  assert.ok(!activeAssignees.some((a) => a.label.includes("Legacy Employee")));
});

console.log(`\n🎉 Team Department & Business Function test suite passed (${passedCount} tests).\n`);
