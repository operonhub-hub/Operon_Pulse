import { UserRole } from "@/types";

export type AttentionType =
  | "TASK_OVERDUE"
  | "TASK_DUE_SOON"
  | "TASK_BLOCKED"
  | "TASK_CRITICAL_BLOCKED"
  | "TASK_REPEATED_CARRYOVER"
  | "WEEKLY_REVIEW_PENDING"
  | "CHECKIN_PENDING"
  | "GOAL_AT_RISK"
  | "GOAL_OFF_TRACK"
  | "ADMIN_CRITICAL_BLOCKERS"
  | "ADMIN_CHECKINS_PENDING"
  | "ADMIN_REVIEWS_PENDING";

export type AttentionSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface AttentionItem {
  key: string;
  type: AttentionType;
  severity: AttentionSeverity;
  title: string;
  description: string;
  href: string;
  contextDate?: string;
  isRead: boolean;
  isDismissed: boolean;
  dismissible: boolean;
  entityId?: string;
  meta?: Record<string, unknown>;
}

export interface DbAttentionState {
  id: string;
  user_id: string;
  attention_key: string;
  read_at: string | null;
  dismissed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttentionCenterData {
  items: AttentionItem[];
  unreadCount: number;
  totalActiveCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
}

export interface AttentionDerivationInput {
  userId: string;
  userRole: UserRole;
  todayStr: string;
  currentWeekStart: string;
  prevWeekStart: string;
  isCheckinDay: boolean;
}
