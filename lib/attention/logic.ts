import type {
  DbTask,
  TaskWithAssignees,
  GoalWithTaskSummary,
  TaskWeeklyReview,
  WeeklyCheckin,
} from "@/types";
import type {
  AttentionItem,
  AttentionSeverity,
  DbAttentionState,
  AttentionCenterData,
} from "./types";

/**
 * Checks whether an active task is past its due date (due_date < todayStr).
 * Completed tasks are never overdue.
 */
export function isTaskOverdue(task: DbTask | TaskWithAssignees, todayStr: string): boolean {
  if (task.status === "DONE" || !task.due_date) {
    return false;
  }
  return task.due_date < todayStr;
}

/**
 * Checks whether an active task is due soon (today <= due_date <= dueSoonThresholdStr).
 * Strict rule: An already overdue task is never classified as due soon.
 */
export function isTaskDueSoon(
  task: DbTask | TaskWithAssignees,
  todayStr: string,
  dueSoonThresholdStr: string
): boolean {
  if (task.status === "DONE" || !task.due_date) {
    return false;
  }
  return task.due_date >= todayStr && task.due_date <= dueSoonThresholdStr;
}

/**
 * Checks whether a task is blocked with non-critical priority.
 */
export function isTaskBlocked(task: DbTask | TaskWithAssignees): boolean {
  const isBlocked = task.status === "BLOCKED" || Boolean(task.is_blocked);
  return isBlocked && task.priority !== "CRITICAL";
}

/**
 * Checks whether a task is blocked with CRITICAL priority.
 */
export function isTaskCriticalBlocked(task: DbTask | TaskWithAssignees): boolean {
  const isBlocked = task.status === "BLOCKED" || Boolean(task.is_blocked);
  return isBlocked && task.priority === "CRITICAL";
}

/**
 * Checks whether an active task has repeated carryover lineage (rollover_count >= 2).
 */
export function isTaskRepeatedCarryover(task: DbTask | TaskWithAssignees): boolean {
  if (task.status === "DONE") {
    return false;
  }
  return (task.rollover_count ?? 0) >= 2;
}

/**
 * Builds deterministic attention items for a user's tasks.
 */
export function buildTaskAttention(
  tasks: (DbTask | TaskWithAssignees)[],
  todayStr: string,
  dueSoonThresholdStr: string
): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const task of tasks) {
    if (task.status === "DONE") {
      continue;
    }

    // 1. Critical Blocker (deduplicates normal blocker)
    if (isTaskCriticalBlocked(task)) {
      items.push({
        key: `task-critical-blocked:${task.id}`,
        type: "TASK_CRITICAL_BLOCKED",
        severity: "CRITICAL",
        title: "Critical Blocker",
        description: task.blocker_reason
          ? `"${task.title}" — ${task.blocker_reason}`
          : `"${task.title}" is blocked with Critical priority`,
        href: "/my-tasks",
        contextDate: task.due_date || undefined,
        isRead: false,
        isDismissed: false,
        dismissible: false,
        entityId: task.id,
      });
    } else if (isTaskBlocked(task)) {
      // 2. Normal Blocker
      items.push({
        key: `task-blocked:${task.id}`,
        type: "TASK_BLOCKED",
        severity: "WARNING",
        title: "Task Blocked",
        description: task.blocker_reason
          ? `"${task.title}" — ${task.blocker_reason}`
          : `"${task.title}" is marked as blocked`,
        href: "/my-tasks",
        contextDate: task.due_date || undefined,
        isRead: false,
        isDismissed: false,
        dismissible: false,
        entityId: task.id,
      });
    }

    // 3. Overdue
    if (isTaskOverdue(task, todayStr)) {
      items.push({
        key: `task-overdue:${task.id}`,
        type: "TASK_OVERDUE",
        severity: "WARNING",
        title: "Task Overdue",
        description: `"${task.title}" was due on ${task.due_date}`,
        href: "/my-tasks",
        contextDate: task.due_date || undefined,
        isRead: false,
        isDismissed: false,
        dismissible: false,
        entityId: task.id,
      });
    } else if (isTaskDueSoon(task, todayStr, dueSoonThresholdStr)) {
      // 4. Due Soon (only if not overdue)
      items.push({
        key: `task-due-soon:${task.id}:${task.due_date}`,
        type: "TASK_DUE_SOON",
        severity: "INFO",
        title: "Task Due Soon",
        description: `"${task.title}" is due on ${task.due_date}`,
        href: "/my-tasks",
        contextDate: task.due_date || undefined,
        isRead: false,
        isDismissed: false,
        dismissible: true,
        entityId: task.id,
      });
    }

    // 5. Repeated Carryover
    if (isTaskRepeatedCarryover(task)) {
      items.push({
        key: `task-carryover:${task.id}`,
        type: "TASK_REPEATED_CARRYOVER",
        severity: "WARNING",
        title: "Repeated Carryover",
        description: `"${task.title}" has been carried across ${task.rollover_count} weekly cycles`,
        href: "/my-tasks",
        contextDate: task.due_date || undefined,
        isRead: false,
        isDismissed: false,
        dismissible: false,
        entityId: task.id,
      });
    }
  }

  return items;
}

/**
 * Builds review attention if user has previous-week incomplete tasks pending review.
 */
export function buildReviewAttention(
  userIncompletePrevWeekTasks: (DbTask | TaskWithAssignees)[],
  reviews: TaskWeeklyReview[],
  userId: string,
  prevWeekStart: string
): AttentionItem[] {
  const reviewedTaskIds = new Set(
    reviews.filter((r) => r.week_start === prevWeekStart).map((r) => r.task_id)
  );

  const pendingCount = userIncompletePrevWeekTasks.filter(
    (t) => !reviewedTaskIds.has(t.id)
  ).length;

  if (pendingCount <= 0) {
    return [];
  }

  return [
    {
      key: `review-pending:${userId}:${prevWeekStart}`,
      type: "WEEKLY_REVIEW_PENDING",
      severity: "INFO",
      title: "Weekly Review Pending",
      description:
        pendingCount === 1
          ? "1 previous-week task requires a weekly review decision"
          : `${pendingCount} previous-week tasks require weekly review decisions`,
      href: `/weekly-review?week=${prevWeekStart}`,
      contextDate: prevWeekStart,
      isRead: false,
      isDismissed: false,
      dismissible: false,
      entityId: userId,
    },
  ];
}

/**
 * Builds check-in reminder for the user. Beginning Thursday, if check-in not submitted.
 */
export function buildCheckinAttention(
  userId: string,
  userCheckin: WeeklyCheckin | null,
  currentWeekStart: string,
  isCheckinDay: boolean
): AttentionItem[] {
  if (!isCheckinDay) {
    return [];
  }

  if (userCheckin && userCheckin.is_submitted) {
    return [];
  }

  return [
    {
      key: `checkin-pending:${userId}:${currentWeekStart}`,
      type: "CHECKIN_PENDING",
      severity: "INFO",
      title: "Weekly Check-in Pending",
      description: "Submit your weekly check-in before the sprint cycle concludes",
      href: `/weekly-review?week=${currentWeekStart}`,
      contextDate: currentWeekStart,
      isRead: false,
      isDismissed: false,
      dismissible: true,
      entityId: userId,
    },
  ];
}

/**
 * Builds goal attention items for Admin (OFF_TRACK and AT_RISK).
 */
export function buildGoalAttention(
  goals: (GoalWithTaskSummary | { id: string; title: string; status: string; calculatedProgress?: number })[],
  currentWeekStart: string
): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const goal of goals) {
    if (goal.status === "OFF_TRACK") {
      items.push({
        key: `goal-off-track:${goal.id}:${currentWeekStart}`,
        type: "GOAL_OFF_TRACK",
        severity: "CRITICAL",
        title: `Goal Off Track: ${goal.title}`,
        description: `Company goal is off track with active blockers or low progress`,
        href: `/goals`,
        contextDate: currentWeekStart,
        isRead: false,
        isDismissed: false,
        dismissible: false,
        entityId: goal.id,
      });
    } else if (goal.status === "AT_RISK") {
      items.push({
        key: `goal-at-risk:${goal.id}:${currentWeekStart}`,
        type: "GOAL_AT_RISK",
        severity: "WARNING",
        title: `Goal At Risk: ${goal.title}`,
        description: `Company goal has risk signals requiring team focus`,
        href: `/goals`,
        contextDate: currentWeekStart,
        isRead: false,
        isDismissed: false,
        dismissible: false,
        entityId: goal.id,
      });
    }
  }

  return items;
}

/**
 * Builds Admin aggregate attention items (team-wide critical blockers, check-in gaps, review gaps).
 */
export function buildAdminAggregateAttention({
  criticalBlockedTasksCount,
  pendingCheckinsCount,
  pendingReviewsCount,
  currentWeekStart,
  prevWeekStart,
  isCheckinDay,
}: {
  criticalBlockedTasksCount: number;
  pendingCheckinsCount: number;
  pendingReviewsCount: number;
  currentWeekStart: string;
  prevWeekStart: string;
  isCheckinDay: boolean;
}): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (criticalBlockedTasksCount > 0) {
    items.push({
      key: `admin-critical-blockers:${currentWeekStart}`,
      type: "ADMIN_CRITICAL_BLOCKERS",
      severity: "CRITICAL",
      title: "Team Critical Blockers",
      description:
        criticalBlockedTasksCount === 1
          ? "1 critical blocker needs team attention"
          : `${criticalBlockedTasksCount} critical blockers need team attention`,
      href: "/team-board",
      contextDate: currentWeekStart,
      isRead: false,
      isDismissed: false,
      dismissible: false,
    });
  }

  if (isCheckinDay && pendingCheckinsCount > 0) {
    items.push({
      key: `admin-checkins:${currentWeekStart}`,
      type: "ADMIN_CHECKINS_PENDING",
      severity: "INFO",
      title: "Team Check-ins Pending",
      description:
        pendingCheckinsCount === 1
          ? "1 weekly check-in is still pending"
          : `${pendingCheckinsCount} weekly check-ins are still pending`,
      href: `/weekly-review?week=${currentWeekStart}`,
      contextDate: currentWeekStart,
      isRead: false,
      isDismissed: false,
      dismissible: true,
    });
  }

  if (pendingReviewsCount > 0) {
    items.push({
      key: `admin-reviews:${prevWeekStart}`,
      type: "ADMIN_REVIEWS_PENDING",
      severity: "INFO",
      title: "Team Reviews Pending",
      description:
        pendingReviewsCount === 1
          ? "1 previous-week task still needs review"
          : `${pendingReviewsCount} previous-week tasks still need review`,
      href: `/weekly-review?week=${prevWeekStart}`,
      contextDate: prevWeekStart,
      isRead: false,
      isDismissed: false,
      dismissible: false,
    });
  }

  return items;
}

const severityWeight: Record<AttentionSeverity, number> = {
  CRITICAL: 3,
  WARNING: 2,
  INFO: 1,
};

/**
 * Merges raw derived attention items with persisted user read/dismiss interaction state.
 * Filters out dismissed items (if dismissible).
 * Sorts strictly: CRITICAL > WARNING > INFO, unread before read, then deterministic tiebreaker.
 */
export function mergeAttentionState(
  derivedItems: AttentionItem[],
  stateMap: Map<string, DbAttentionState>
): AttentionItem[] {
  const merged: AttentionItem[] = [];

  for (const item of derivedItems) {
    const state = stateMap.get(item.key);
    const isRead = Boolean(state?.read_at);
    const isDismissed = Boolean(state?.dismissed_at);

    // If dismissible and user dismissed it, omit from visible active items
    if (item.dismissible && isDismissed) {
      continue;
    }

    merged.push({
      ...item,
      isRead,
      isDismissed,
    });
  }

  // Deterministic sorting
  return merged.sort((a, b) => {
    // 1. Severity weight descending
    const weightA = severityWeight[a.severity] || 0;
    const weightB = severityWeight[b.severity] || 0;
    if (weightA !== weightB) {
      return weightB - weightA;
    }

    // 2. Unread before read
    if (a.isRead !== b.isRead) {
      return a.isRead ? 1 : -1;
    }

    // 3. Title alphabetical tiebreaker
    return a.title.localeCompare(b.title);
  });
}

/**
 * Calculates summary metrics for the Attention Center.
 */
export function calculateAttentionSummary(items: AttentionItem[]): AttentionCenterData {
  const unreadCount = items.filter((item) => !item.isRead).length;
  const criticalCount = items.filter((item) => item.severity === "CRITICAL").length;
  const warningCount = items.filter((item) => item.severity === "WARNING").length;
  const infoCount = items.filter((item) => item.severity === "INFO").length;

  return {
    items,
    unreadCount,
    totalActiveCount: items.length,
    criticalCount,
    warningCount,
    infoCount,
  };
}
