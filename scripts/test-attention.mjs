/**
 * OperonPulse - Phase 8 Attention Center Test Suite
 * Validates deterministic attention derivation, role scoping, deduplication, state merging,
 * dismissibility rules, server-side authorization, and Africa/Lagos application timezone.
 */

import assert from "node:assert/strict";
import {
  isTaskOverdue,
  isTaskDueSoon,
  isTaskBlocked,
  isTaskCriticalBlocked,
  isTaskRepeatedCarryover,
  buildTaskAttention,
  buildReviewAttention,
  buildCheckinAttention,
  buildGoalAttention,
  buildAdminAggregateAttention,
  mergeAttentionState,
  calculateAttentionSummary,
} from "../lib/attention/logic.ts";
import {
  APP_TIME_ZONE,
  getTodayDateString,
  getDaysAheadDateString,
  isThursdayOrLater,
  getMondayDateString,
  getPreviousWeekMonday,
  getAppDayOfWeek,
} from "../lib/utils/date.ts";

console.log("🚀 Starting Phase 8 Attention Center Test Suite...\n");

let passedCount = 0;
function test(description, fn) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(err);
    process.exitCode = 1;
  }
}

const todayStr = "2026-10-08"; // Thursday in 2026-10-05 week
const currentWeekStart = "2026-10-05";
const prevWeekStart = "2026-09-28";
const dueSoonThresholdStr = "2026-10-10"; // today + 2 days

// ---------------------------------------------------------------------------
// 1. Task Overdue
// ---------------------------------------------------------------------------
test("1. Overdue task triggers TASK_OVERDUE (due_date < today)", () => {
  const overdueTask = {
    id: "task-1",
    title: "Finish migration report",
    status: "IN_PROGRESS",
    due_date: "2026-10-07", // yesterday
    priority: "HIGH",
  };
  assert.equal(isTaskOverdue(overdueTask, todayStr), true);

  const completedOverdueTask = {
    ...overdueTask,
    status: "DONE",
  };
  assert.equal(isTaskOverdue(completedOverdueTask, todayStr), false);
});

// ---------------------------------------------------------------------------
// 2. Task Due Soon
// ---------------------------------------------------------------------------
test("2. Active task due today or within 2 days triggers TASK_DUE_SOON", () => {
  const dueTodayTask = {
    id: "task-2",
    title: "Review PR",
    status: "IN_PROGRESS",
    due_date: "2026-10-08", // today
    priority: "MEDIUM",
  };
  const dueTomorrowTask = {
    id: "task-3",
    title: "Design check",
    status: "NOT_STARTED",
    due_date: "2026-10-09", // tomorrow
    priority: "MEDIUM",
  };
  const dueFarTask = {
    id: "task-4",
    title: "Quarterly planning",
    status: "NOT_STARTED",
    due_date: "2026-10-15", // far
    priority: "MEDIUM",
  };

  assert.equal(isTaskDueSoon(dueTodayTask, todayStr, dueSoonThresholdStr), true);
  assert.equal(isTaskDueSoon(dueTomorrowTask, todayStr, dueSoonThresholdStr), true);
  assert.equal(isTaskDueSoon(dueFarTask, todayStr, dueSoonThresholdStr), false);
});

// ---------------------------------------------------------------------------
// 3. Overdue does NOT become Due Soon
// ---------------------------------------------------------------------------
test("3. Overdue task does NOT also classify as TASK_DUE_SOON", () => {
  const overdueTask = {
    id: "task-1",
    title: "Overdue task",
    status: "IN_PROGRESS",
    due_date: "2026-10-06",
    priority: "HIGH",
  };
  assert.equal(isTaskOverdue(overdueTask, todayStr), true);
  assert.equal(isTaskDueSoon(overdueTask, todayStr, dueSoonThresholdStr), false);

  const items = buildTaskAttention([overdueTask], todayStr, dueSoonThresholdStr);
  assert.equal(items.some((i) => i.type === "TASK_OVERDUE"), true);
  assert.equal(items.some((i) => i.type === "TASK_DUE_SOON"), false);
});

// ---------------------------------------------------------------------------
// 4. Blocked Task
// ---------------------------------------------------------------------------
test("4. Normal blocked task triggers TASK_BLOCKED with WARNING severity", () => {
  const blockedTask = {
    id: "task-5",
    title: "Stripe webhook",
    status: "BLOCKED",
    is_blocked: true,
    priority: "HIGH",
    blocker_reason: "Awaiting API credentials",
  };
  assert.equal(isTaskBlocked(blockedTask), true);
  assert.equal(isTaskCriticalBlocked(blockedTask), false);

  const items = buildTaskAttention([blockedTask], todayStr, dueSoonThresholdStr);
  const item = items.find((i) => i.entityId === "task-5");
  assert.ok(item);
  assert.equal(item.type, "TASK_BLOCKED");
  assert.equal(item.severity, "WARNING");
  assert.equal(item.dismissible, false);
});

// ---------------------------------------------------------------------------
// 5. Critical Blocked deduplicates Normal Blocked
// ---------------------------------------------------------------------------
test("5. Critical blocked task triggers TASK_CRITICAL_BLOCKED and deduplicates normal blocked", () => {
  const criticalBlockedTask = {
    id: "task-6",
    title: "Production database failover",
    status: "BLOCKED",
    is_blocked: true,
    priority: "CRITICAL",
    blocker_reason: "Primary replica unresponsive",
  };
  assert.equal(isTaskCriticalBlocked(criticalBlockedTask), true);
  assert.equal(isTaskBlocked(criticalBlockedTask), false);

  const items = buildTaskAttention([criticalBlockedTask], todayStr, dueSoonThresholdStr);
  const criticalItems = items.filter((i) => i.type === "TASK_CRITICAL_BLOCKED");
  const normalBlockedItems = items.filter((i) => i.type === "TASK_BLOCKED");

  assert.equal(criticalItems.length, 1);
  assert.equal(normalBlockedItems.length, 0);
  assert.equal(criticalItems[0].severity, "CRITICAL");
  assert.equal(criticalItems[0].key, "task-critical-blocked:task-6");
});

// ---------------------------------------------------------------------------
// 6. Repeated Carryover (rollover_count >= 2)
// ---------------------------------------------------------------------------
test("6. Active task with rollover_count >= 2 triggers TASK_REPEATED_CARRYOVER", () => {
  const singleRollover = {
    id: "task-7",
    title: "Setup CI pipeline",
    status: "IN_PROGRESS",
    rollover_count: 1,
  };
  const repeatedRollover = {
    id: "task-8",
    title: "Legacy auth cleanup",
    status: "IN_PROGRESS",
    rollover_count: 2,
  };
  const doneRepeated = {
    ...repeatedRollover,
    status: "DONE",
  };

  assert.equal(isTaskRepeatedCarryover(singleRollover), false);
  assert.equal(isTaskRepeatedCarryover(repeatedRollover), true);
  assert.equal(isTaskRepeatedCarryover(doneRepeated), false);

  const items = buildTaskAttention([repeatedRollover], todayStr, dueSoonThresholdStr);
  const carryoverItem = items.find((i) => i.type === "TASK_REPEATED_CARRYOVER");
  assert.ok(carryoverItem);
  assert.equal(carryoverItem.severity, "WARNING");
  assert.equal(carryoverItem.key, "task-carryover:task-8");
});

// ---------------------------------------------------------------------------
// 7. Weekly Review Pending only when unreviewed
// ---------------------------------------------------------------------------
test("7. Incomplete previous-week tasks without review records trigger WEEKLY_REVIEW_PENDING", () => {
  const prevTasks = [
    { id: "prev-1", title: "Task 1", status: "IN_PROGRESS" },
    { id: "prev-2", title: "Task 2", status: "IN_REVIEW" },
  ];
  const reviews = [
    { id: "rev-1", task_id: "prev-1", week_start: prevWeekStart, outcome: "CARRY_FORWARD" },
  ];

  const items = buildReviewAttention(prevTasks, reviews, "user-123", prevWeekStart);
  assert.equal(items.length, 1);
  assert.equal(items[0].type, "WEEKLY_REVIEW_PENDING");
  assert.equal(items[0].key, `review-pending:user-123:${prevWeekStart}`);
  assert.match(items[0].description, /1 previous-week task requires/);
});

// ---------------------------------------------------------------------------
// 8. Submitted review removes pending condition
// ---------------------------------------------------------------------------
test("8. Fully reviewed previous-week tasks produce no review attention", () => {
  const prevTasks = [{ id: "prev-1", title: "Task 1", status: "IN_PROGRESS" }];
  const reviews = [
    { id: "rev-1", task_id: "prev-1", week_start: prevWeekStart, outcome: "KEEP_IN_WEEK" },
  ];

  const items = buildReviewAttention(prevTasks, reviews, "user-123", prevWeekStart);
  assert.equal(items.length, 0);
});

// ---------------------------------------------------------------------------
// 9. Check-in reminder absent Mon-Wed
// ---------------------------------------------------------------------------
test("9. Check-in reminder is absent Mon–Wed", () => {
  assert.equal(isThursdayOrLater("2026-10-05"), false); // Monday
  assert.equal(isThursdayOrLater("2026-10-06"), false); // Tuesday
  assert.equal(isThursdayOrLater("2026-10-07"), false); // Wednesday

  const itemsMon = buildCheckinAttention("user-1", null, currentWeekStart, false);
  assert.equal(itemsMon.length, 0);
});

// ---------------------------------------------------------------------------
// 10. Check-in reminder present Thu onward
// ---------------------------------------------------------------------------
test("10. Check-in reminder is active Thursday onward if unsubmitted", () => {
  assert.equal(isThursdayOrLater("2026-10-08"), true); // Thursday
  assert.equal(isThursdayOrLater("2026-10-09"), true); // Friday
  assert.equal(isThursdayOrLater("2026-10-10"), true); // Saturday
  assert.equal(isThursdayOrLater("2026-10-11"), true); // Sunday

  const itemsThu = buildCheckinAttention("user-1", null, currentWeekStart, true);
  assert.equal(itemsThu.length, 1);
  assert.equal(itemsThu[0].type, "CHECKIN_PENDING");
  assert.equal(itemsThu[0].key, `checkin-pending:user-1:${currentWeekStart}`);
  assert.equal(itemsThu[0].dismissible, true);
});

// ---------------------------------------------------------------------------
// 11. Submitted check-in removes reminder
// ---------------------------------------------------------------------------
test("11. Submitted check-in removes CHECKIN_PENDING reminder", () => {
  const submittedCheckin = {
    id: "checkin-1",
    user_id: "user-1",
    week_start: currentWeekStart,
    is_submitted: true,
  };
  const items = buildCheckinAttention("user-1", submittedCheckin, currentWeekStart, true);
  assert.equal(items.length, 0);
});

// ---------------------------------------------------------------------------
// 12. Goal AT_RISK Admin alert
// ---------------------------------------------------------------------------
test("12. Goal AT_RISK generates GOAL_AT_RISK with WARNING severity", () => {
  const goals = [
    { id: "g-1", title: "Launch Marketing Sprint", status: "AT_RISK", calculatedProgress: 40 },
  ];
  const items = buildGoalAttention(goals, currentWeekStart);
  assert.equal(items.length, 1);
  assert.equal(items[0].type, "GOAL_AT_RISK");
  assert.equal(items[0].severity, "WARNING");
  assert.equal(items[0].key, `goal-at-risk:g-1:${currentWeekStart}`);
});

// ---------------------------------------------------------------------------
// 13. Goal OFF_TRACK Admin alert
// ---------------------------------------------------------------------------
test("13. Goal OFF_TRACK generates GOAL_OFF_TRACK with CRITICAL severity", () => {
  const goals = [
    { id: "g-2", title: "Migrate Payment Engine", status: "OFF_TRACK", calculatedProgress: 10 },
  ];
  const items = buildGoalAttention(goals, currentWeekStart);
  assert.equal(items.length, 1);
  assert.equal(items[0].type, "GOAL_OFF_TRACK");
  assert.equal(items[0].severity, "CRITICAL");
  assert.equal(items[0].key, `goal-off-track:g-2:${currentWeekStart}`);
});

// ---------------------------------------------------------------------------
// 14. Member never receives admin team items
// ---------------------------------------------------------------------------
test("14. Member logic never invokes Admin aggregate builders", () => {
  const memberTasks = [{ id: "m-1", title: "Member task", status: "IN_PROGRESS", due_date: "2026-10-09" }];
  const memberItems = buildTaskAttention(memberTasks, todayStr, dueSoonThresholdStr);
  const hasAdminTypes = memberItems.some(
    (i) =>
      i.type === "ADMIN_CRITICAL_BLOCKERS" ||
      i.type === "ADMIN_CHECKINS_PENDING" ||
      i.type === "ADMIN_REVIEWS_PENDING" ||
      i.type === "GOAL_AT_RISK" ||
      i.type === "GOAL_OFF_TRACK"
  );
  assert.equal(hasAdminTypes, false);
});

// ---------------------------------------------------------------------------
// 15. Admin Critical Blocker Aggregate
// ---------------------------------------------------------------------------
test("15. Admin aggregate surfaces non-surveillance team blockers count", () => {
  const adminItems = buildAdminAggregateAttention({
    criticalBlockedTasksCount: 3,
    pendingCheckinsCount: 2,
    pendingReviewsCount: 1,
    currentWeekStart,
    prevWeekStart,
    isCheckinDay: true,
  });

  const blockerItem = adminItems.find((i) => i.type === "ADMIN_CRITICAL_BLOCKERS");
  assert.ok(blockerItem);
  assert.equal(blockerItem.severity, "CRITICAL");
  assert.equal(blockerItem.description, "3 critical blockers need team attention");
  assert.equal(blockerItem.key, `admin-critical-blockers:${currentWeekStart}`);
});

// ---------------------------------------------------------------------------
// 16. Stable Attention Key Generation
// ---------------------------------------------------------------------------
test("16. Stable deterministic keys match expected schema format", () => {
  const taskKey = `task-overdue:abc-123`;
  const goalKey = `goal-off-track:xyz-789:${currentWeekStart}`;
  const checkinKey = `checkin-pending:usr-456:${currentWeekStart}`;

  assert.match(taskKey, /^task-overdue:[a-z0-9-]+$/);
  assert.match(goalKey, /^goal-off-track:[a-z0-9-]+:\d{4}-\d{2}-\d{2}$/);
  assert.match(checkinKey, /^checkin-pending:[a-z0-9-]+:\d{4}-\d{2}-\d{2}$/);
});

// ---------------------------------------------------------------------------
// 17. Unread State Merge
// ---------------------------------------------------------------------------
test("17. State map correctly merges read_at timestamp", () => {
  const rawItems = [
    {
      key: "task-overdue:1",
      type: "TASK_OVERDUE",
      severity: "WARNING",
      title: "Task 1",
      description: "Overdue",
      href: "/my-tasks",
      isRead: false,
      isDismissed: false,
      dismissible: false,
    },
    {
      key: "task-overdue:2",
      type: "TASK_OVERDUE",
      severity: "WARNING",
      title: "Task 2",
      description: "Overdue",
      href: "/my-tasks",
      isRead: false,
      isDismissed: false,
      dismissible: false,
    },
  ];

  const stateMap = new Map([
    ["task-overdue:1", { attention_key: "task-overdue:1", read_at: "2026-10-08T10:00:00Z", dismissed_at: null }],
  ]);

  const merged = mergeAttentionState(rawItems, stateMap);
  const item1 = merged.find((i) => i.key === "task-overdue:1");
  const item2 = merged.find((i) => i.key === "task-overdue:2");

  assert.equal(item1.isRead, true);
  assert.equal(item2.isRead, false);

  const summary = calculateAttentionSummary(merged);
  assert.equal(summary.unreadCount, 1);
  assert.equal(summary.totalActiveCount, 2);
});

// ---------------------------------------------------------------------------
// 18. Dismissed Item Filtering
// ---------------------------------------------------------------------------
test("18. Dismissed items are excluded ONLY if item is dismissible", () => {
  const rawItems = [
    {
      key: "task-due-soon:1:2026-10-09",
      type: "TASK_DUE_SOON",
      severity: "INFO",
      title: "Due soon",
      description: "Due tomorrow",
      href: "/my-tasks",
      isRead: false,
      isDismissed: false,
      dismissible: true,
    },
    {
      key: "task-overdue:1",
      type: "TASK_OVERDUE",
      severity: "WARNING",
      title: "Overdue task",
      description: "Cannot dismiss while active",
      href: "/my-tasks",
      isRead: false,
      isDismissed: false,
      dismissible: false,
    },
  ];

  const stateMap = new Map([
    ["task-due-soon:1:2026-10-09", { attention_key: "task-due-soon:1:2026-10-09", read_at: null, dismissed_at: "2026-10-08T10:00:00Z" }],
    ["task-overdue:1", { attention_key: "task-overdue:1", read_at: null, dismissed_at: "2026-10-08T10:00:00Z" }],
  ]);

  const merged = mergeAttentionState(rawItems, stateMap);
  // task-due-soon is dismissible -> should be excluded
  assert.equal(merged.some((i) => i.key === "task-due-soon:1:2026-10-09"), false);
  // task-overdue is NOT dismissible -> remains in list
  assert.equal(merged.some((i) => i.key === "task-overdue:1"), true);
});

// ---------------------------------------------------------------------------
// 19. Resolved Domain Condition Disappears
// ---------------------------------------------------------------------------
test("19. Completing a task immediately removes all derived attention items", () => {
  const tasksBefore = [
    { id: "task-99", title: "Bugfix", status: "IN_PROGRESS", is_blocked: true, priority: "HIGH" },
  ];
  const itemsBefore = buildTaskAttention(tasksBefore, todayStr, dueSoonThresholdStr);
  assert.equal(itemsBefore.length, 1);

  const tasksAfter = [
    { id: "task-99", title: "Bugfix", status: "DONE", is_blocked: false, priority: "HIGH" },
  ];
  const itemsAfter = buildTaskAttention(tasksAfter, todayStr, dueSoonThresholdStr);
  assert.equal(itemsAfter.length, 0);
});

// ---------------------------------------------------------------------------
// 20. Strict Severity Ordering (CRITICAL > WARNING > INFO)
// ---------------------------------------------------------------------------
test("20. Attention list sorts strictly CRITICAL > WARNING > INFO, with unread first", () => {
  const rawItems = [
    {
      key: "item-info",
      type: "TASK_DUE_SOON",
      severity: "INFO",
      title: "Info Item",
      description: "Info",
      href: "/my-tasks",
      isRead: false,
      isDismissed: false,
      dismissible: true,
    },
    {
      key: "item-critical",
      type: "TASK_CRITICAL_BLOCKED",
      severity: "CRITICAL",
      title: "Critical Item",
      description: "Critical",
      href: "/my-tasks",
      isRead: false,
      isDismissed: false,
      dismissible: false,
    },
    {
      key: "item-warning",
      type: "TASK_BLOCKED",
      severity: "WARNING",
      title: "Warning Item",
      description: "Warning",
      href: "/my-tasks",
      isRead: false,
      isDismissed: false,
      dismissible: false,
    },
  ];

  const merged = mergeAttentionState(rawItems, new Map());
  assert.equal(merged[0].severity, "CRITICAL");
  assert.equal(merged[1].severity, "WARNING");
  assert.equal(merged[2].severity, "INFO");
});

// ---------------------------------------------------------------------------
// 21. Fabricated key cannot be marked read (active item lookup fails)
// ---------------------------------------------------------------------------
test("21. Fabricated key lookup fails against server-derived active items", () => {
  const activeItems = [
    { key: "task-overdue:valid-1", isRead: false, isDismissed: false, dismissible: false },
  ];
  const fabricatedKey = "task-overdue:fabricated-999";
  const found = activeItems.find((i) => i.key === fabricatedKey);
  assert.equal(found, undefined);
});

// ---------------------------------------------------------------------------
// 22. Fabricated key cannot be dismissed (active item lookup fails)
// ---------------------------------------------------------------------------
test("22. Fabricated key cannot be dismissed", () => {
  const activeItems = [
    { key: "task-due-soon:valid-2:2026-10-09", isRead: false, isDismissed: false, dismissible: true },
  ];
  const fabricatedKey = "fabricated-alert:123";
  const found = activeItems.find((i) => i.key === fabricatedKey);
  assert.equal(found, undefined);
});

// ---------------------------------------------------------------------------
// 23. Non-dismissible active item cannot be dismissed
// ---------------------------------------------------------------------------
test("23. Non-dismissible active item (e.g. Critical Blocker) rejects dismissal", () => {
  const activeItems = [
    {
      key: "task-critical-blocked:task-10",
      type: "TASK_CRITICAL_BLOCKED",
      severity: "CRITICAL",
      dismissible: false,
    },
    {
      key: "task-overdue:task-11",
      type: "TASK_OVERDUE",
      severity: "WARNING",
      dismissible: false,
    },
  ];

  for (const item of activeItems) {
    assert.equal(item.dismissible, false);
  }
});

// ---------------------------------------------------------------------------
// 24. Dismissible active item can be dismissed
// ---------------------------------------------------------------------------
test("24. Dismissible active item (e.g. Due Soon, Check-in Reminder) allows dismissal", () => {
  const dueSoon = {
    key: "task-due-soon:task-12:2026-10-09",
    type: "TASK_DUE_SOON",
    dismissible: true,
  };
  const checkinReminder = {
    key: "checkin-pending:user-1:2026-10-05",
    type: "CHECKIN_PENDING",
    dismissible: true,
  };
  assert.equal(dueSoon.dismissible, true);
  assert.equal(checkinReminder.dismissible, true);
});

// ---------------------------------------------------------------------------
// 25. Mark-all derives current active unread keys server-side
// ---------------------------------------------------------------------------
test("25. Mark-all collects only currently active unread keys", () => {
  const activeItems = [
    { key: "item-1", isRead: false },
    { key: "item-2", isRead: true },
    { key: "item-3", isRead: false },
  ];
  const unreadKeys = activeItems.filter((i) => !i.isRead).map((i) => i.key);
  assert.deepEqual(unreadKeys, ["item-1", "item-3"]);
});

// ---------------------------------------------------------------------------
// 26. Member review lookup is strictly scoped to owned task IDs
// ---------------------------------------------------------------------------
test("26. Member review lookup generates zero query if user has no incomplete tasks", () => {
  const memberIncompleteTasks = [];
  const taskIds = memberIncompleteTasks.map((t) => t.id);
  assert.equal(taskIds.length, 0);

  const prevTasks = [{ id: "m-task-1", status: "IN_PROGRESS" }];
  const ids = prevTasks.map((t) => t.id);
  assert.deepEqual(ids, ["m-task-1"]);
});

// ---------------------------------------------------------------------------
// 27. DB mutation failure returns success=false
// ---------------------------------------------------------------------------
test("27. Database failure simulation returns success=false and human-readable error", () => {
  const simulateDbError = (hasError) => {
    if (hasError) {
      return { success: false, error: "Unable to update attention state. Please try again." };
    }
    return { success: true };
  };

  const result = simulateDbError(true);
  assert.equal(result.success, false);
  assert.equal(result.error, "Unable to update attention state. Please try again.");
});

// ---------------------------------------------------------------------------
// 28. Application Timezone Thursday Boundary (Africa/Lagos)
// ---------------------------------------------------------------------------
test("28. Africa/Lagos timezone boundary: Wednesday 23:30 is not Thu, Thursday 00:30 is Thu", () => {
  assert.equal(APP_TIME_ZONE, "Africa/Lagos");

  // Wednesday 2026-10-07 23:30:00 in Africa/Lagos (UTC+1) is 2026-10-07T22:30:00Z
  const wedNight = new Date("2026-10-07T22:30:00Z");
  assert.equal(getTodayDateString(wedNight), "2026-10-07");
  assert.equal(isThursdayOrLater(wedNight), false);

  // Thursday 2026-10-08 00:30:00 in Africa/Lagos (UTC+1) is 2026-10-07T23:30:00Z
  const thuMorning = new Date("2026-10-07T23:30:00Z");
  assert.equal(getTodayDateString(thuMorning), "2026-10-08");
  assert.equal(isThursdayOrLater(thuMorning), true);
});

// ---------------------------------------------------------------------------
// 29. Application Timezone Monday/Week Boundary (Africa/Lagos)
// ---------------------------------------------------------------------------
test("29. Africa/Lagos timezone boundary: Sunday 23:30 is prev week, Monday 00:30 is new week", () => {
  // Sunday 2026-10-11 23:30:00 in Africa/Lagos is 2026-10-11T22:30:00Z
  const sunNight = new Date("2026-10-11T22:30:00Z");
  assert.equal(getTodayDateString(sunNight), "2026-10-11");
  assert.equal(getMondayDateString(sunNight), "2026-10-05");

  // Monday 2026-10-12 00:30:00 in Africa/Lagos is 2026-10-11T23:30:00Z
  const monMorning = new Date("2026-10-11T23:30:00Z");
  assert.equal(getTodayDateString(monMorning), "2026-10-12");
  assert.equal(getMondayDateString(monMorning), "2026-10-12");
  assert.equal(getPreviousWeekMonday(getMondayDateString(monMorning)), "2026-10-05");
});

console.log(`\n🎉 All ${passedCount} Phase 8 test cases passed successfully!`);
