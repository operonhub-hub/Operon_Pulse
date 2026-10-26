/**
 * Supporting-role tasks: selection, support metrics, contributions,
 * team totals (no double-counting) and supporter attention.
 *
 * Imports production modules only (no local copies).
 */
import assert from "node:assert/strict";
import {
  isOwnedTask,
  isSupportingTask,
  selectMyTasks,
  selectSupportingTasks,
} from "../lib/tasks/selectors.ts";
import {
  buildMemberSupportSummary,
  buildTeamContributionTotals,
  buildWorkloadMetrics,
  calculateContributions,
} from "../lib/insights/logic.ts";
import {
  buildSupportTaskAttention,
  isSupportAttention,
  mergeAttentionState,
} from "../lib/attention/logic.ts";

console.log("🚀 Starting Supporting-Role Test Suite...\n");

let passed = 0;
function test(description, fn) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(err);
    process.exitCode = 1;
  }
}

const task = (id, owner_id, support_person_id, status = "IN_PROGRESS", extra = {}) => ({
  id,
  title: `Task ${id}`,
  owner_id,
  support_person_id,
  status,
  is_blocked: status === "BLOCKED",
  blocker_reason: status === "BLOCKED" ? "Waiting on vendor" : null,
  priority: "MEDIUM",
  due_date: null,
  week_start: "2026-10-26",
  rollover_count: 0,
  ...extra,
});

const profile = (id, name) => ({
  id,
  full_name: name,
  email: `${id}@x.io`,
  avatar_url: null,
  role: "MEMBER",
  is_active: true,
});

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

test("1. Supporting = support person and not owner", () => {
  assert.equal(isSupportingTask(task("t", "ann", "bob"), "bob"), true);
  assert.equal(isSupportingTask(task("t", "ann", "bob"), "ann"), false);
  assert.equal(isSupportingTask(task("t", "ann", null), "bob"), false);
});

test("2. Owner listed as their own support person is excluded", () => {
  assert.equal(isSupportingTask(task("t", "ann", "ann"), "ann"), false);
  assert.deepEqual(selectSupportingTasks([task("t", "ann", "ann")], "ann"), []);
});

test("3. Missing user never matches (signed out / empty id)", () => {
  for (const id of [null, undefined, ""]) {
    assert.equal(isSupportingTask(task("t", "ann", "bob"), id), false);
    assert.equal(isOwnedTask(task("t", "ann", "bob"), id), false);
  }
});

test("4. selectSupportingTasks returns only supported tasks, in order", () => {
  const tasks = [task("a", "bob", "ann"), task("b", "ann", "bob"), task("c", "cat", "ann"), task("d", "ann", null)];
  assert.deepEqual(selectSupportingTasks(tasks, "ann").map((t) => t.id), ["a", "c"]);
});

test("5. 'Mine' = owned + supporting, each task once", () => {
  const tasks = [task("a", "ann", "bob"), task("b", "bob", "ann"), task("c", "ann", "ann"), task("d", "cat", "bob")];
  assert.deepEqual(selectMyTasks(tasks, "ann").map((t) => t.id), ["a", "b", "c"]);
});

// ---------------------------------------------------------------------------
// Support metrics & contributions
// ---------------------------------------------------------------------------

test("6. Contributions = owned completed + supported completed", () => {
  assert.equal(calculateContributions(3, 2), 5);
  assert.equal(calculateContributions(0, 0), 0);
});

test("7. Member support summary counts supported tasks and completion", () => {
  const tasks = [
    task("a", "bob", "ann", "DONE"),
    task("b", "bob", "ann", "IN_PROGRESS"),
    task("c", "ann", null, "DONE"),
    task("d", "ann", "bob", "DONE"),
    task("e", "ann", "ann", "DONE"), // owned; self-support doesn't add support credit
  ];
  assert.deepEqual(buildMemberSupportSummary(tasks, "ann"), {
    memberId: "ann",
    supported: 2,
    supportedCompleted: 1,
    supportCompletionRate: 50,
    ownedCompleted: 3,
    contributions: 4,
  });
});

test("8. No supported tasks -> rate is null, contributions = owned completed", () => {
  const summary = buildMemberSupportSummary([task("a", "ann", null, "DONE")], "ann");
  assert.equal(summary.supported, 0);
  assert.equal(summary.supportCompletionRate, null);
  assert.equal(summary.contributions, 1);
});

test("9. Duplicate task rows are counted once", () => {
  const t = task("a", "bob", "ann", "DONE");
  assert.equal(buildMemberSupportSummary([t, t, { ...t }], "ann").supportedCompleted, 1);
});

test("10. Workload: owner metrics are unchanged by support data", () => {
  const profiles = [profile("ann", "Ann"), profile("bob", "Bob")];
  const withoutSupport = [task("a", "ann", null, "DONE"), task("b", "bob", null, "IN_PROGRESS")];
  const withSupport = [task("a", "ann", "bob", "DONE"), task("b", "bob", "ann", "IN_PROGRESS")];
  const pick = (rows) => rows.map(({ memberId, planned, completed, active, blocked, critical, completionRate }) =>
    ({ memberId, planned, completed, active, blocked, critical, completionRate }));
  assert.deepEqual(pick(buildWorkloadMetrics(withSupport, profiles)), pick(buildWorkloadMetrics(withoutSupport, profiles)));
});

test("11. Workload: support columns and contributions per member", () => {
  const profiles = [profile("ann", "Ann"), profile("bob", "Bob")];
  const tasks = [
    task("a", "ann", "bob", "DONE"),
    task("b", "ann", "bob", "IN_PROGRESS"),
    task("c", "bob", null, "DONE"),
    task("d", "bob", "bob", "DONE"), // self-support ignored
  ];
  const [ann, bob] = buildWorkloadMetrics(tasks, profiles);
  assert.deepEqual(
    [ann.supported, ann.supportedCompleted, ann.supportCompletionRate, ann.contributions],
    [0, 0, null, 1]
  );
  assert.deepEqual(
    [bob.supported, bob.supportedCompleted, bob.supportCompletionRate, bob.contributions],
    [2, 1, 50, 3] // 2 owned completed (c, d) + 1 supported completed (a)
  );
});

// ---------------------------------------------------------------------------
// Team totals: each task exactly once
// ---------------------------------------------------------------------------

test("12. Team totals count a supported task once, though both members get credit", () => {
  const profiles = [profile("ann", "Ann"), profile("bob", "Bob")];
  const tasks = [task("a", "ann", "bob", "DONE")];
  const workload = buildWorkloadMetrics(tasks, profiles);
  const totals = buildTeamContributionTotals(tasks, workload.map((w) => w.contributions));
  assert.equal(totals.completedTasks, 1);
  assert.equal(totals.completedWithSupport, 1);
  assert.equal(totals.supportedTasks, 1);
  assert.equal(totals.sumOfMemberContributions, 2); // owner + supporter credit, by design
});

test("13. Team totals: duplicates and self-support never inflate counts", () => {
  const a = task("a", "ann", "bob", "DONE");
  const tasks = [a, a, task("b", "cat", "cat", "DONE"), task("c", "ann", "bob", "IN_PROGRESS"), task("d", "ann", null)];
  const totals = buildTeamContributionTotals(tasks);
  assert.equal(totals.completedTasks, 2); // a, b
  assert.equal(totals.completedWithSupport, 1); // a only (b is self-support)
  assert.equal(totals.supportedTasks, 2); // a, c
  assert.equal(totals.sumOfMemberContributions, 0);
});

// ---------------------------------------------------------------------------
// Supporter attention
// ---------------------------------------------------------------------------

const today = "2026-10-28";

test("14. Supporter gets 'blocked' and 'overdue' items for supported tasks", () => {
  const items = buildSupportTaskAttention(
    [
      task("a", "bob", "ann", "BLOCKED"),
      task("b", "bob", "ann", "IN_PROGRESS", { due_date: "2026-10-27" }),
    ],
    "ann",
    today
  );
  assert.deepEqual(items.map((i) => i.type), ["SUPPORT_TASK_BLOCKED", "SUPPORT_TASK_OVERDUE"]);
  assert.equal(items[0].title, "Task you support is blocked");
  assert.equal(items[1].title, "Task you support is overdue");
  assert.ok(items.every((i) => i.severity === "INFO" && i.dismissible && isSupportAttention(i)));
});

test("15. No supporter items for owned, self-supported, done or healthy tasks", () => {
  const items = buildSupportTaskAttention(
    [
      task("a", "ann", "bob", "BLOCKED"), // ann owns it
      task("b", "ann", "ann", "BLOCKED"), // self-support
      task("c", "bob", "ann", "DONE", { due_date: "2026-10-01" }),
      task("d", "bob", "ann", "IN_PROGRESS", { due_date: "2026-11-30" }),
    ],
    "ann",
    today
  );
  assert.deepEqual(items, []);
});

test("16. Supporter items rank below every owner item, even INFO owner items", () => {
  const owner = { key: "task-due-soon:x", type: "TASK_DUE_SOON", severity: "INFO", title: "Z owner", description: "", href: "/", isRead: true, isDismissed: false, dismissible: true };
  const support = buildSupportTaskAttention([task("a", "bob", "ann", "BLOCKED")], "ann", today);
  const merged = mergeAttentionState([...support, owner], new Map());
  assert.deepEqual(merged.map((i) => i.type), ["TASK_DUE_SOON", "SUPPORT_TASK_BLOCKED"]);
});

test("17. Supporter items respect read and dismiss state", () => {
  const [item] = buildSupportTaskAttention([task("a", "bob", "ann", "BLOCKED")], "ann", today);
  const read = mergeAttentionState([item], new Map([[item.key, { read_at: "2026-10-28T09:00:00Z", dismissed_at: null }]]));
  assert.equal(read[0].isRead, true);
  const dismissed = mergeAttentionState([item], new Map([[item.key, { read_at: "x", dismissed_at: "2026-10-28T09:00:00Z" }]]));
  assert.deepEqual(dismissed, []);
});

if (process.exitCode) {
  console.error(`\n❌ Supporting-role test suite failed (${passed} passed).`);
} else {
  console.log(`\n🎉 Supporting-role test suite passed (${passed} tests).`);
}
