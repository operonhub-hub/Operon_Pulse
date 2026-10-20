/**
 * Subtasks: progress calculation, status rules and permission rules.
 *
 * Imports the production module lib/subtasks/logic.ts (no local copies).
 * The same rules are enforced in SQL by
 * supabase/migrations/20261020000000_add_task_subtasks.sql.
 */
import assert from "node:assert/strict";
import {
  MAX_SUBTASKS_PER_TASK,
  SUBTASK_TITLE_MAX_LENGTH,
  canManageSubtasks,
  canToggleSubtasks,
  computeSubtaskProgress,
  deriveTaskStateAfterSubtaskChange,
  getOpenSubtaskCount,
  getSubtaskCounts,
  moveSubtask,
  nextSubtaskPosition,
  normalizeSubtaskTitle,
  progressAfterSubtaskChange,
  shouldPromptMarkDone,
  sortSubtasks,
  statusAfterSubtaskChange,
} from "../lib/subtasks/logic.ts";

console.log("🚀 Starting Subtasks Test Suite...\n");

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

const done = (n) => Array.from({ length: n }, () => ({ is_done: true }));
const open = (n) => Array.from({ length: n }, () => ({ is_done: false }));
const list = (d, o) => [...done(d), ...open(o)];

// ---------------------------------------------------------------------------
// Progress calculation
// ---------------------------------------------------------------------------

test("1. No subtasks -> progress stays manual (null)", () => {
  assert.equal(computeSubtaskProgress([]), null);
  assert.equal(computeSubtaskProgress(undefined), null);
  assert.equal(computeSubtaskProgress(null), null);
});

test("2. Progress = round(done / total * 100)", () => {
  assert.equal(computeSubtaskProgress(list(0, 4)), 0);
  assert.equal(computeSubtaskProgress(list(1, 3)), 25);
  assert.equal(computeSubtaskProgress(list(2, 2)), 50);
  assert.equal(computeSubtaskProgress(list(4, 0)), 100);
});

test("3. Rounding matches Postgres round(): 1/3 -> 33, 2/3 -> 67, 1/8 -> 13", () => {
  assert.equal(computeSubtaskProgress(list(1, 2)), 33);
  assert.equal(computeSubtaskProgress(list(2, 1)), 67);
  assert.equal(computeSubtaskProgress(list(1, 7)), 13);
  assert.equal(computeSubtaskProgress(list(1, 199)), 1); // 0.5 rounds up
});

test("4. Counts and open count", () => {
  assert.deepEqual(getSubtaskCounts(list(3, 2)), { done: 3, total: 5 });
  assert.equal(getOpenSubtaskCount(list(3, 2)), 2);
  assert.equal(getOpenSubtaskCount([]), 0);
});

test("5. Stored progress: DONE is always 100; no subtasks keeps the manual value", () => {
  assert.equal(progressAfterSubtaskChange("DONE", list(1, 3), 40), 100);
  assert.equal(progressAfterSubtaskChange("IN_PROGRESS", list(1, 3), 40), 25);
  assert.equal(progressAfterSubtaskChange("IN_PROGRESS", [], 40), 40);
});

// ---------------------------------------------------------------------------
// Status rules
// ---------------------------------------------------------------------------

test("6. First tick on a NOT_STARTED task -> IN_PROGRESS", () => {
  assert.equal(statusAfterSubtaskChange("NOT_STARTED", list(1, 3), { newlyDone: true }), "IN_PROGRESS");
});

test("7. Adding an open subtask to a NOT_STARTED task keeps NOT_STARTED", () => {
  assert.equal(statusAfterSubtaskChange("NOT_STARTED", list(0, 2), { newlyDone: false }), "NOT_STARTED");
});

test("8. All subtasks ticked does NOT auto-complete the task", () => {
  assert.equal(statusAfterSubtaskChange("IN_PROGRESS", list(4, 0), { newlyDone: true }), "IN_PROGRESS");
  assert.equal(statusAfterSubtaskChange("IN_REVIEW", list(4, 0), { newlyDone: true }), "IN_REVIEW");
});

test("9. Unticking (or adding an open subtask) on a DONE task reopens it", () => {
  assert.equal(statusAfterSubtaskChange("DONE", list(3, 1), { newlyDone: false }), "IN_PROGRESS");
});

test("10. DONE stays DONE while every subtask is done", () => {
  assert.equal(statusAfterSubtaskChange("DONE", list(4, 0), { newlyDone: true }), "DONE");
});

test("11. Ticking on a BLOCKED task keeps it BLOCKED", () => {
  assert.equal(statusAfterSubtaskChange("BLOCKED", list(1, 1), { newlyDone: true }), "BLOCKED");
});

test("12. Derived task state combines status and progress", () => {
  assert.deepEqual(
    deriveTaskStateAfterSubtaskChange({ status: "NOT_STARTED", progress: 0 }, list(1, 3), { newlyDone: true }),
    { status: "IN_PROGRESS", progress: 25 }
  );
  assert.deepEqual(
    deriveTaskStateAfterSubtaskChange({ status: "DONE", progress: 100 }, list(3, 1), { newlyDone: false }),
    { status: "IN_PROGRESS", progress: 75 }
  );
});

test("13. 'Mark task as Done?' prompt only when all done and not already DONE", () => {
  assert.equal(shouldPromptMarkDone("IN_PROGRESS", list(3, 0)), true);
  assert.equal(shouldPromptMarkDone("BLOCKED", list(3, 0)), true);
  assert.equal(shouldPromptMarkDone("DONE", list(3, 0)), false);
  assert.equal(shouldPromptMarkDone("IN_PROGRESS", list(2, 1)), false);
  assert.equal(shouldPromptMarkDone("IN_PROGRESS", []), false);
});

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

const task = { owner_id: "owner", support_person_id: "support" };
const as = (userId, isAdmin = false) => ({ userId, isAdmin });

test("14. Owner can manage and toggle", () => {
  assert.equal(canManageSubtasks(as("owner"), task), true);
  assert.equal(canToggleSubtasks(as("owner"), task), true);
});

test("15. Support person can toggle but not manage (add/rename/reorder/delete)", () => {
  assert.equal(canToggleSubtasks(as("support"), task), true);
  assert.equal(canManageSubtasks(as("support"), task), false);
});

test("16. Admin can manage and toggle any task", () => {
  assert.equal(canManageSubtasks(as("someone", true), task), true);
  assert.equal(canToggleSubtasks(as("someone", true), task), true);
});

test("17. Unrelated member can do neither", () => {
  assert.equal(canManageSubtasks(as("other"), task), false);
  assert.equal(canToggleSubtasks(as("other"), task), false);
});

test("18. Signed-out or missing user can do neither, even if support is unset", () => {
  const noSupport = { owner_id: "owner", support_person_id: null };
  for (const id of [null, undefined, ""]) {
    assert.equal(canManageSubtasks(as(id), noSupport), false);
    assert.equal(canToggleSubtasks(as(id), noSupport), false);
  }
});

// ---------------------------------------------------------------------------
// Titles and ordering
// ---------------------------------------------------------------------------

test("19. Titles are trimmed and validated", () => {
  assert.deepEqual(normalizeSubtaskTitle("  Draft brief  "), { ok: true, title: "Draft brief" });
  assert.equal(normalizeSubtaskTitle("   ").ok, false);
  assert.equal(normalizeSubtaskTitle(undefined).ok, false);
  assert.equal(normalizeSubtaskTitle(42).ok, false);
  assert.equal(normalizeSubtaskTitle("x".repeat(SUBTASK_TITLE_MAX_LENGTH)).ok, true);
  assert.equal(normalizeSubtaskTitle("x".repeat(SUBTASK_TITLE_MAX_LENGTH + 1)).ok, false);
});

const st = (id, position, created_at = "2026-10-20T00:00:00Z") => ({ id, position, created_at });

test("20. Ordering: by position, then creation time", () => {
  const sorted = sortSubtasks([st("c", 1), st("a", 0, "2026-10-20T00:00:02Z"), st("b", 0, "2026-10-20T00:00:01Z")]);
  assert.deepEqual(sorted.map((s) => s.id), ["b", "a", "c"]);
});

test("21. Next position appends after the highest", () => {
  assert.equal(nextSubtaskPosition([]), 0);
  assert.equal(nextSubtaskPosition([st("a", 0), st("b", 4)]), 5);
});

test("22. Move up/down swaps neighbours and returns only changed rows", () => {
  const items = [st("a", 0), st("b", 1), st("c", 2)];
  const up = moveSubtask(items, "c", "up");
  assert.deepEqual(up.ordered.map((s) => s.id), ["a", "c", "b"]);
  assert.deepEqual(up.changed, [{ id: "c", position: 1 }, { id: "b", position: 2 }]);
  const down = moveSubtask(items, "a", "down");
  assert.deepEqual(down.ordered.map((s) => [s.id, s.position]), [["b", 0], ["a", 1], ["c", 2]]);
});

test("23. Moving past either end, or an unknown id, is a no-op (null)", () => {
  const items = [st("a", 0), st("b", 1)];
  assert.equal(moveSubtask(items, "a", "up"), null);
  assert.equal(moveSubtask(items, "b", "down"), null);
  assert.equal(moveSubtask(items, "zzz", "up"), null);
});

test("24. Gapped positions are renumbered 0..n-1 after a move", () => {
  const moved = moveSubtask([st("a", 3), st("b", 7), st("c", 9)], "b", "up");
  assert.deepEqual(moved.ordered.map((s) => [s.id, s.position]), [["b", 0], ["a", 1], ["c", 2]]);
  assert.deepEqual(moved.changed.map((c) => c.id).sort(), ["a", "b", "c"]);
});

test("25. Per-task limit is a sensible positive number", () => {
  assert.ok(Number.isInteger(MAX_SUBTASKS_PER_TASK) && MAX_SUBTASKS_PER_TASK > 0);
});

if (process.exitCode) {
  console.error(`\n❌ Subtasks test suite failed (${passed} passed).`);
} else {
  console.log(`\n🎉 Subtasks test suite passed (${passed} tests).`);
}
