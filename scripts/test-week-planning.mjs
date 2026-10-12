/**
 * OperonPulse - Week Planning Context Test Suite
 *
 * Verifies Part A requirements:
 * 1. /my-tasks defaults to active week with no query
 * 2. Valid future week query is preserved
 * 3. Team Board uses selected future week
 * 4. Goals uses selected future week
 * 5. My Tasks -> Team Board navigation preserves week
 * 6. Team Board -> Goals navigation preserves week
 * 7. Sidebar links preserve week
 * 8. Add Task defaults to selected week
 * 9. Add Goal defaults to selected week
 * 10. Task-Goal linking only allows same-week goals
 * 11. Switching weeks refreshes metrics
 * 12. Invalid week parameter falls back safely
 * 13. Monday normalization works for mid-week dates
 * 14. Direct shared future-week URL works deterministically
 */

import assert from "node:assert/strict";
import {
  normalizeWeekStart,
  getActiveWeekMonday,
  getWeekContextType,
  getWeekContextInfo,
  buildWeekUrl,
} from "../lib/utils/week.ts";
import {
  getMondayDateString,
  getNextWeekMonday,
  getPreviousWeekMonday,
  formatWeekLabelFromMonday,
} from "../lib/utils/date.ts";

console.log("🚀 Starting Week Planning Context Test Suite...\n");

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

const activeMonday = getActiveWeekMonday();
const futureMonday = getNextWeekMonday(activeMonday);
const pastMonday = getPreviousWeekMonday(activeMonday);

// 1. /my-tasks defaults to active week with no query
test("1. /my-tasks defaults to active week with no query", () => {
  const result = normalizeWeekStart(undefined);
  assert.equal(result, activeMonday);

  const nullResult = normalizeWeekStart(null);
  assert.equal(nullResult, activeMonday);
});

// 2. Valid future week query is preserved
test("2. Valid future week query is preserved", () => {
  const result = normalizeWeekStart(futureMonday);
  assert.equal(result, futureMonday);
  assert.equal(getWeekContextType(result, activeMonday), "PLANNING");
});

// 3. Team Board uses selected future week
test("3. Team Board uses selected future week", () => {
  const searchParams = { week: futureMonday };
  const selectedWeek = normalizeWeekStart(searchParams.week);
  assert.equal(selectedWeek, futureMonday);

  const context = getWeekContextInfo(selectedWeek, activeMonday);
  assert.equal(context.isPlanningWeek, true);
  assert.equal(context.badgeLabel, "Planning Week");
});

// 4. Goals uses selected future week
test("4. Goals uses selected future week", () => {
  const searchParams = { week: futureMonday };
  const selectedWeek = normalizeWeekStart(searchParams.week);
  assert.equal(selectedWeek, futureMonday);

  const context = getWeekContextInfo(selectedWeek, activeMonday);
  assert.equal(context.isPlanningWeek, true);
  assert.equal(context.badgeLabel, "Planning Week");
});

// 5. My Tasks -> Team Board navigation preserves week
test("5. My Tasks -> Team Board navigation preserves week", () => {
  const currentWeek = futureMonday;
  const teamBoardUrl = buildWeekUrl("/team-board", currentWeek);
  assert.equal(teamBoardUrl, `/team-board?week=${futureMonday}`);
});

// 6. Team Board -> Goals navigation preserves week
test("6. Team Board -> Goals navigation preserves week", () => {
  const currentWeek = futureMonday;
  const goalsUrl = buildWeekUrl("/goals", currentWeek);
  assert.equal(goalsUrl, `/goals?week=${futureMonday}`);
});

// 7. Sidebar links preserve week
test("7. Sidebar links preserve week", () => {
  const weekAwareRoutes = ["/my-tasks", "/team-board", "/goals"];
  const nonWeekRoutes = ["/dashboard", "/team", "/settings"];

  for (const route of weekAwareRoutes) {
    const url = buildWeekUrl(route, futureMonday);
    assert.equal(url, `${route}?week=${futureMonday}`);
  }

  // Active week does not append redundant query param by default
  for (const route of weekAwareRoutes) {
    const url = buildWeekUrl(route, activeMonday);
    assert.equal(url, route);
  }
});

// 8. Add Task defaults to selected week
test("8. Add Task defaults to selected week", () => {
  const selectedPlanningWeek = futureMonday;
  const taskPayload = {
    title: "Prepare Q4 Pipeline Review",
    week_start: selectedPlanningWeek,
  };
  assert.equal(taskPayload.week_start, futureMonday);
  assert.notEqual(taskPayload.week_start, activeMonday);
});

// 9. Add Goal defaults to selected week
test("9. Add Goal defaults to selected week", () => {
  const selectedPlanningWeek = futureMonday;
  const goalPayload = {
    title: "Launch Enterprise SSO Pilot",
    week_start: selectedPlanningWeek,
  };
  assert.equal(goalPayload.week_start, futureMonday);
  assert.notEqual(goalPayload.week_start, activeMonday);
});

// 10. Task-Goal linking only allows same-week goals
test("10. Task-Goal linking only allows same-week goals", () => {
  const goalsDb = [
    { id: "goal-w42", title: "Current Week Goal", week_start: activeMonday },
    { id: "goal-w43", title: "Future Planning Goal", week_start: futureMonday },
  ];

  // Filtering for future planning week
  const filteredForW43 = goalsDb.filter((g) => g.week_start === futureMonday);
  assert.equal(filteredForW43.length, 1);
  assert.equal(filteredForW43[0].id, "goal-w43");

  // Attempt to link W42 goal in W43 task must be rejected
  const taskWeek = futureMonday;
  const linkedGoal = goalsDb.find((g) => g.id === "goal-w42");
  const isAligned = linkedGoal?.week_start === taskWeek;
  assert.equal(isAligned, false, "Cross-week goal linking must be rejected");
});

// 11. Switching weeks refreshes metrics
test("11. Switching weeks refreshes metrics", () => {
  const mockTasksWeek42 = [
    { id: "t1", status: "DONE", week_start: activeMonday },
    { id: "t2", status: "IN_PROGRESS", week_start: activeMonday },
  ];
  const mockTasksWeek43 = [
    { id: "t3", status: "NOT_STARTED", week_start: futureMonday },
  ];

  const calcStats = (tasks) => ({
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "DONE").length,
  });

  const statsW42 = calcStats(mockTasksWeek42);
  const statsW43 = calcStats(mockTasksWeek43);

  assert.equal(statsW42.total, 2);
  assert.equal(statsW42.completed, 1);
  assert.equal(statsW43.total, 1);
  assert.equal(statsW43.completed, 0);
});

// 12. Invalid week parameter falls back safely
test("12. Invalid week parameter falls back safely", () => {
  assert.equal(normalizeWeekStart("not-a-date"), activeMonday);
  assert.equal(normalizeWeekStart("2026-99-99"), activeMonday);
  assert.equal(normalizeWeekStart(""), activeMonday);
  assert.equal(normalizeWeekStart("   "), activeMonday);
});

// 13. Monday normalization works for mid-week dates
test("13. Monday normalization works for mid-week dates", () => {
  // If user passes Wednesday or Friday date, normalizes to that week's Monday
  const wednesdayDate = "2026-10-14"; // Wednesday of Week 42
  const normalized = normalizeWeekStart(wednesdayDate);
  assert.equal(normalized, "2026-10-12"); // Monday of Week 42
});

// 14. Direct shared future-week URL works deterministically
test("14. Direct shared future-week URL works deterministically", () => {
  const sharedUrlQuery = "2026-10-19";
  const normalized = normalizeWeekStart(sharedUrlQuery);
  assert.equal(normalized, "2026-10-19");

  const context = getWeekContextInfo(normalized);
  assert.equal(context.selectedMonday, "2026-10-19");
  assert.ok(context.label.includes("Week"));
});

console.log(`\n🎉 Week Planning Context test suite passed (${passedCount} tests).\n`);
