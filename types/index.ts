export type Priority = "Critical" | "High" | "Medium" | "Low";
export type Status = "Not Started" | "In Progress" | "In Review" | "Done" | "Blocked";

export type UserRole = "ADMIN" | "MEMBER";

export type TaskPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type TaskStatus = "NOT_STARTED" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "BLOCKED";

export type GoalStatus = "ON_TRACK" | "AT_RISK" | "OFF_TRACK" | "ACHIEVED";

export type TaskReviewOutcome = "CARRY_FORWARD" | "CANCEL" | "REASSIGN" | "KEEP_IN_WEEK";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  department?: string | null;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeeklyGoal {
  id: string;
  title: string;
  description: string | null;
  week_start: string; // YYYY-MM-DD (ISO Monday)
  status: GoalStatus;
  created_by: string;
  owner_id: string | null;
  target_date: string | null;
  created_at: string;
  updated_at: string;
  owner?: Profile | null;
  created_by_profile?: Profile | null;
}

export interface GoalWithTaskSummary extends WeeklyGoal {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  inReviewTasks: number;
  blockedTasks: number;
  calculatedProgress: number; // Derived average: 0 to 100
  riskSignals: string[];
  isReadyForAchieved: boolean;
  linkedTasks?: TaskWithAssignees[];
}

export interface DbTask {
  id: string;
  title: string;
  description: string | null;
  owner_id: string;
  created_by: string;
  support_person_id: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  due_date: string | null;
  week_start: string; // YYYY-MM-DD
  is_blocked: boolean;
  blocker_reason: string | null;
  acceptance_criteria: string | null;
  goal_id?: string | null;
  carried_from_task_id?: string | null;
  rollover_count?: number;
  rollover_note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskSubtask {
  id: string;
  task_id: string;
  title: string;
  is_done: boolean;
  position: number;
  created_by: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskWithAssignees extends DbTask {
  owner?: Profile | null;
  created_by_profile?: Profile | null;
  support_person?: Profile | null;
  goal?: WeeklyGoal | null;
  carried_from_task?: TaskWithAssignees | null;
  review_outcome?: TaskReviewOutcome | null;
  /** Ordered by position. Empty or undefined when the task has no subtasks. */
  subtasks?: TaskSubtask[];
}

export interface TaskWeeklyReview {
  id: string;
  task_id: string;
  week_start: string;
  outcome: TaskReviewOutcome;
  note: string | null;
  reviewed_by: string;
  created_at: string;
  reviewer?: Profile | null;
}

export interface WeeklyCheckin {
  id: string;
  user_id: string;
  week_start: string;
  completed_summary: string | null;
  incomplete_summary: string | null;
  blockers_summary: string | null;
  next_week_focus: string | null;
  is_submitted: boolean;
  submitted_at: string | null;
  updated_at: string;
  user?: Profile | null;
}

export interface TeamMemberCheckinStatus {
  profile: Profile;
  hasSubmitted: boolean;
  checkin?: WeeklyCheckin | null;
}

export interface WeeklyExecutionSummary {
  weekStart: string;
  totalTasksPlanned: number;
  tasksCompleted: number;
  completionRate: number; // 0 to 100%
  incompleteTasksCount: number;
  inProgressTasksCount: number;
  blockedTasksCount: number;
  criticalBlockedCount: number;
  totalGoalsCommitted: number;
  goalsAchievedCount: number;
  goalsAtRiskCount: number;
  averageGoalProgress: number | null;
  totalCarryovers: number;
  repeatedCarryovers: number;
  checkinsSubmittedCount: number;
  totalTeamMembersCount: number;
  summaryParagraph: string;
}

// Display mappings
export const priorityDisplayMap: Record<TaskPriority, Priority> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const statusDisplayMap: Record<TaskStatus, Status> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
  BLOCKED: "Blocked",
};

export const goalStatusDisplayMap: Record<GoalStatus, string> = {
  ON_TRACK: "On Track",
  AT_RISK: "At Risk",
  OFF_TRACK: "Off Track",
  ACHIEVED: "Achieved",
};

export const reviewOutcomeDisplayMap: Record<TaskReviewOutcome, string> = {
  CARRY_FORWARD: "Carry Forward",
  CANCEL: "Cancel",
  REASSIGN: "Reassign",
  KEEP_IN_WEEK: "Keep in Week",
};

export interface UserProfile {
  name: string;
  firstName: string;
  email: string;
  initials: string;
  role: UserRole | string;
  workspaceName: string;
  isActive?: boolean;
}
