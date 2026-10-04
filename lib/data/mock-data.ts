import { Task, TeamMember, StatMetric, AttentionItem, WeeklyFocus, UserProfile } from "@/types";

export const currentUser: UserProfile = {
  name: "David Peterson",
  firstName: "David",
  email: "david@operonpulse.io",
  initials: "DP",
  role: "Founder & Product Lead",
  workspaceName: "OperonPulse HQ",
};

export const weeklyOverviewStats: StatMetric[] = [
  {
    id: "tasks-planned",
    label: "Tasks Planned",
    value: 12,
    change: "+3 vs last week",
    changeType: "positive",
    variant: "default",
  },
  {
    id: "completed",
    label: "Completed",
    value: 7,
    change: "58% completion rate",
    changeType: "positive",
    variant: "success",
  },
  {
    id: "in-progress",
    label: "In Progress",
    value: 4,
    change: "3 on track",
    changeType: "neutral",
    variant: "info",
  },
  {
    id: "blocked",
    label: "Blocked",
    value: 1,
    change: "Requires unblock",
    changeType: "negative",
    variant: "danger",
  },
];

export const weeklyFocusData: WeeklyFocus = {
  title: "Launch OperonPulse onboarding improvements",
  description: "Streamline team invites and initial workspace setup to improve Day-7 retention.",
  progress: 68,
  totalTasks: 8,
  completedTasks: 5,
};

export const attentionItems: AttentionItem[] = [
  {
    id: "att-1",
    title: "Payment integration blocked",
    category: "blocked",
    severity: "critical",
    timestamp: "2 hours ago",
  },
  {
    id: "att-2",
    title: "Homepage review overdue",
    category: "overdue",
    severity: "warning",
    timestamp: "Yesterday",
  },
];

export const sampleTasks: Task[] = [
  {
    id: "task-1",
    title: "Resolve webhook timeout on Stripe payment connector",
    priority: "Critical",
    status: "Blocked",
    progress: 30,
    dueDate: "Oct 7",
    assignee: {
      name: "Praise Adeleke",
      initials: "PA",
    },
  },
  {
    id: "task-2",
    title: "Implement Supabase client & environment scaffolding",
    priority: "High",
    status: "In Progress",
    progress: 75,
    dueDate: "Oct 8",
    assignee: {
      name: "David Peterson",
      initials: "DP",
    },
  },
  {
    id: "task-3",
    title: "Design mobile responsiveness for team board",
    priority: "High",
    status: "In Review",
    progress: 90,
    dueDate: "Oct 8",
    assignee: {
      name: "Sarah Chen",
      initials: "SC",
    },
  },
  {
    id: "task-4",
    title: "Prepare weekly founder execution metrics report",
    priority: "Medium",
    status: "Not Started",
    progress: 0,
    dueDate: "Oct 10",
    assignee: {
      name: "David Peterson",
      initials: "DP",
    },
  },
  {
    id: "task-5",
    title: "Finalize Phase 1 App Shell & component foundation",
    priority: "High",
    status: "Done",
    progress: 100,
    dueDate: "Oct 5",
    assignee: {
      name: "Alex Morgan",
      initials: "AM",
    },
  },
];

export const sampleTeamMembers: TeamMember[] = [
  {
    id: "tm-1",
    name: "Sarah Chen",
    role: "Product Designer",
    progress: 80,
    initials: "SC",
    activeTasksCount: 4,
  },
  {
    id: "tm-2",
    name: "David Peterson",
    role: "Founder / Lead",
    progress: 65,
    initials: "DP",
    activeTasksCount: 5,
  },
  {
    id: "tm-3",
    name: "Praise Adeleke",
    role: "Backend Engineer",
    progress: 55,
    initials: "PA",
    activeTasksCount: 3,
  },
  {
    id: "tm-4",
    name: "Alex Morgan",
    role: "Frontend Engineer",
    progress: 40,
    initials: "AM",
    activeTasksCount: 4,
  },
];
