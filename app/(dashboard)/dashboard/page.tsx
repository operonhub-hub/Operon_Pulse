import * as React from "react";
import Link from "next/link";
import {
  ListTodo,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Target,
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  Plus,
  Layers,
  ShieldCheck,
  TrendingUp,
  LayoutGrid,
} from "lucide-react";
import { PageContainer } from "@/components/shared/page-container";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { GoalStatusBadge } from "@/components/goals/goal-status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { getTimeBasedGreeting, getMondayDateString } from "@/lib/utils/date";
import { getCurrentUserSession } from "@/lib/auth/session";
import { getGoalsWithTaskSummary } from "@/lib/goals/queries";
import { calculateOverallGoalProgress } from "@/lib/goals/logic";
import { getCurrentUserAttentionCenterData } from "@/lib/attention/queries";
import { priorityDisplayMap, statusDisplayMap } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getCurrentUserSession();
  const greeting = getTimeBasedGreeting();
  const userName = session.displayUser.firstName || session.displayUser.name;
  const greetingText = userName ? `${greeting}, ${userName}` : greeting;
  const isAdmin = session.profile?.role === "ADMIN" || session.displayUser.role === "ADMIN";

  // Query live tasks, weekly goals, and user attention for active week
  const currentWeekStart = getMondayDateString();
  const [{ goals: liveGoals, allWeekTasks: liveTasks }, attentionData] = await Promise.all([
    getGoalsWithTaskSummary(currentWeekStart),
    getCurrentUserAttentionCenterData(),
  ]);

  // Compute live task metrics
  const hasLiveTasks = liveTasks.length > 0;
  const liveTotal = liveTasks.length;
  const liveCompleted = liveTasks.filter((t) => t.status === "DONE").length;
  const liveInProgress = liveTasks.filter(
    (t) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW"
  ).length;
  const liveBlocked = liveTasks.filter((t) => t.is_blocked || t.status === "BLOCKED").length;

  // Compute live goal metrics
  const hasLiveGoals = liveGoals.length > 0;
  const totalGoals = liveGoals.length;
  const achievedGoals = liveGoals.filter((g) => g.status === "ACHIEVED").length;
  const atRiskGoals = liveGoals.filter(
    (g) => g.status === "AT_RISK" || g.riskSignals.length > 0
  ).length;
  const offTrackGoals = liveGoals.filter((g) => g.status === "OFF_TRACK").length;
  const overallGoalProgress = calculateOverallGoalProgress(liveGoals);

  // High-level execution stats
  const liveStats = [
    {
      id: "tasks-planned",
      label: "Tasks Planned",
      value: liveTotal,
      change: `${liveTotal} active commitments`,
      changeType: "positive" as const,
    },
    {
      id: "completed",
      label: "Completed",
      value: liveCompleted,
      change: `${liveTotal > 0 ? Math.round((liveCompleted / liveTotal) * 100) : 0}% task completion`,
      changeType: "positive" as const,
    },
    {
      id: "in-progress",
      label: "In Progress",
      value: liveInProgress,
      change: `${liveInProgress} in flight`,
      changeType: "neutral" as const,
    },
    {
      id: "blocked",
      label: "Blocked",
      value: liveBlocked,
      change: liveBlocked > 0 ? "Requires unblocking" : "All clear",
      changeType: (liveBlocked === 0 ? "positive" : "negative") as "positive" | "negative",
    },
  ];

  const statIcons = {
    "tasks-planned": ListTodo,
    completed: CheckCircle2,
    "in-progress": Clock,
    blocked: AlertOctagon,
  };

  const accentColors = {
    "tasks-planned": "default" as const,
    completed: "emerald" as const,
    "in-progress": "blue" as const,
    blocked: "rose" as const,
  };

  return (
    <PageContainer className="space-y-8 pb-16">
      {/* 1. Header Greeting Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200/80 pb-6 dark:border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {greetingText}
            </h1>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60">
                <ShieldCheck className="h-3.5 w-3.5" /> Founder View
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {isAdmin
              ? "Founder Execution Overview for the current sprint week."
              : "Here is your weekly execution progress and company priorities."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild className="gap-1.5 border-stone-200 dark:border-stone-700">
            <Link href="/insights">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              <span>Insights</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-1.5 border-stone-200 dark:border-stone-700">
            <Link href="/weekly-review">
              <ArrowRightLeft className="h-3.5 w-3.5 text-sky-500" />
              <span>Weekly Review</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-1.5 border-stone-200 dark:border-stone-700">
            <Link href="/goals">
              <Target className="h-3.5 w-3.5 text-amber-500" />
              <span>Goals ({totalGoals})</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-1.5 border-stone-200 dark:border-stone-700">
            <Link href="/team-board">
              <LayoutGrid className="h-3.5 w-3.5 text-stone-500" />
              <span>Team Board</span>
            </Link>
          </Button>
          <Button variant="default" size="sm" asChild className="gap-1.5 bg-stone-900 text-white hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-600">
            <Link href="/my-tasks">
              <Plus className="h-3.5 w-3.5" />
              <span>Add Task</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Admin Founder Overview KPI summary */}
      {isAdmin && (
        <div className="space-y-3">
          <SectionHeader
            title="Founder Execution Overview"
            description="Outcome-focused tracking of weekly company goals and alignment"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Total Goals */}
            <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span>Weekly Goals</span>
                <Target className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                  {totalGoals}
                </span>
                <span className="text-xs text-stone-400">outcomes</span>
              </div>
            </div>

            {/* Average Goal Progress */}
            <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span>Avg Goal Progress</span>
                <TrendingUp className="h-4 w-4 text-sky-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                  {overallGoalProgress !== null ? `${overallGoalProgress}%` : "—"}
                </span>
                <span className="text-xs text-stone-400">derived</span>
              </div>
            </div>

            {/* Goals Achieved */}
            <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
              <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                <span>Achieved</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {achievedGoals}
                </span>
                <span className="text-xs text-stone-400">completed</span>
              </div>
            </div>

            {/* Goals At Risk */}
            <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
              <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400">
                <span>At Risk</span>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                  {atRiskGoals}
                </span>
                <span className="text-xs text-stone-400">need focus</span>
              </div>
            </div>

            {/* Off Track */}
            <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400">
                <span>Off Track / Blocked</span>
                <AlertOctagon className="h-4 w-4 text-rose-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                  {offTrackGoals + (liveBlocked > 0 ? 1 : 0)}
                </span>
                <span className="text-xs text-stone-400">action needed</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Weekly Task Progress Overview (4 Stat Cards) */}
      <div className="space-y-3">
        <SectionHeader
          title="Weekly Task Execution"
          description="Operational task progress across team commitments"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {liveStats.map((stat) => {
            const Icon = statIcons[stat.id as keyof typeof statIcons] || ListTodo;
            const accent = accentColors[stat.id as keyof typeof accentColors] || "default";

            return (
              <StatCard
                key={stat.id}
                title={stat.label}
                value={stat.value}
                change={stat.change}
                changeType={stat.changeType}
                icon={Icon}
                accentColor={accent}
              />
            );
          })}
        </div>
      </div>

      {/* 4. Mid Grid: Company Goals & Needs Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Goals Card (2 cols on lg) */}
        <Card className="lg:col-span-2 border-stone-200/80 dark:border-stone-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100/80 text-amber-800 dark:bg-amber-950 dark:text-amber-400">
                  <Target className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-semibold">Company Weekly Goals</CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs text-amber-700 hover:text-amber-800 dark:text-amber-400 gap-1">
                <Link href="/goals">
                  <span>View All Goals</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
            <CardDescription className="pt-1 text-xs text-stone-500 dark:text-stone-400">
              Primary company-level objectives committed for the active week
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5 pt-1">
            {hasLiveGoals ? (
              <div className="space-y-3">
                {liveGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="rounded-xl border border-stone-100 bg-stone-50/70 p-3.5 dark:border-stone-800 dark:bg-stone-900/50 transition-colors hover:border-amber-200 dark:hover:border-amber-900/50"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                          {goal.title}
                        </span>
                        <GoalStatusBadge status={goal.status} />
                      </div>
                      <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                        {goal.calculatedProgress}% derived
                      </span>
                    </div>

                    <Progress
                      value={goal.calculatedProgress}
                      indicatorClassName={
                        goal.status === "ACHIEVED"
                          ? "bg-emerald-500"
                          : goal.status === "OFF_TRACK"
                          ? "bg-rose-500"
                          : "bg-amber-500"
                      }
                      className="h-2 bg-stone-200/80 dark:bg-stone-800"
                    />

                    <div className="mt-2 flex flex-wrap items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                      <span>
                        {goal.completedTasks} of {goal.totalTasks} linked tasks completed
                      </span>
                      {goal.owner && (
                        <span>Owner: {goal.owner.full_name || goal.owner.email}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-stone-200 p-8 text-center dark:border-stone-800">
                <Target className="mx-auto h-7 w-7 text-stone-400 mb-2" />
                <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                  No company goals defined for this week
                </p>
                <p className="mt-1 text-[11px] text-stone-500">
                  {isAdmin
                    ? "Create company-level goals to align your team's execution."
                    : "Company goals will appear here once defined by founders."}
                </p>
                {isAdmin && (
                  <Button asChild size="sm" className="mt-3 bg-amber-500 text-white hover:bg-amber-600">
                    <Link href="/goals">Create Weekly Goal</Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Needs Attention Card (1 col on lg) */}
        <Card className="border-stone-200/80 dark:border-stone-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-100/80 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-semibold">Needs Attention</CardTitle>
              </div>
              <span className="rounded-full bg-rose-50 border border-rose-200/70 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900">
                {attentionData.unreadCount > 0
                  ? `${attentionData.unreadCount} unread`
                  : `${attentionData.totalActiveCount} active`}
              </span>
            </div>
            <CardDescription className="pt-1 text-xs text-stone-500 dark:text-stone-400">
              Active blockers, overdue items & required weekly decisions
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            {attentionData.items.length > 0 ? (
              <div className="space-y-3">
                <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                  {attentionData.items.slice(0, 4).map((item) => (
                    <li key={item.key} className="py-2.5 first:pt-0 last:pb-0">
                      <Link
                        href={item.href}
                        className="group flex items-start gap-2.5 rounded-lg p-1.5 -mx-1.5 transition-colors hover:bg-stone-50/80 dark:hover:bg-stone-800/40"
                      >
                        <span
                          className={`mt-1.5 flex h-2 w-2 shrink-0 rounded-full ${
                            item.severity === "CRITICAL"
                              ? "bg-rose-500"
                              : item.severity === "WARNING"
                              ? "bg-amber-500"
                              : "bg-sky-500"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 leading-snug group-hover:text-amber-700 dark:group-hover:text-amber-400">
                              {item.title}
                            </p>
                            <ArrowRight className="h-3 w-3 shrink-0 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1">
                            {item.description}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-stone-500 dark:text-stone-400">
                <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500 mb-2" />
                <p className="font-semibold text-stone-800 dark:text-stone-200">You&apos;re all caught up</p>
                <p className="mt-0.5 text-[11px] text-stone-400">
                  No execution issues currently need your attention.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. Lower Grid: My Tasks Preview */}
      <Card className="border-stone-200/80 dark:border-stone-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Active Weekly Tasks</CardTitle>
                <CardDescription className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  High-priority deliverables in the current weekly cycle
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 gap-1">
              <Link href="/my-tasks">
                <span>View all ({liveTotal})</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-y border-stone-100 bg-stone-50/70 text-[11px] font-semibold text-stone-500 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-400 uppercase tracking-wider">
                  <th className="px-5 py-3">Task</th>
                  <th className="px-4 py-3">Goal</th>
                  <th className="px-4 py-3">Assignee</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-5 py-3 text-right">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                {hasLiveTasks ? (
                  liveTasks.slice(0, 5).map((task) => (
                    <tr
                      key={task.id}
                      className="group transition-colors hover:bg-stone-50/70 dark:hover:bg-stone-800/30"
                    >
                      <td className="px-5 py-3.5 font-medium text-stone-900 dark:text-stone-100 max-w-xs truncate">
                        {task.title}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {task.goal ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                            <Target className="h-2.5 w-2.5" />
                            <span className="max-w-[110px] truncate">{task.goal.title}</span>
                          </span>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-stone-600 dark:text-stone-400">
                        {task.owner?.full_name || task.owner?.email || "Unassigned"}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <PriorityBadge priority={priorityDisplayMap[task.priority]} />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge status={statusDisplayMap[task.status]} />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap min-w-[110px]">
                        <div className="flex items-center gap-2">
                          <Progress
                            value={task.progress}
                            className="h-1.5 w-14"
                            indicatorClassName={
                              task.status === "DONE"
                                ? "bg-emerald-500"
                                : task.status === "BLOCKED"
                                ? "bg-rose-500"
                                : "bg-stone-800 dark:bg-amber-500"
                            }
                          />
                          <span className="text-[11px] font-medium text-stone-500">
                            {task.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap text-stone-500">
                        {task.due_date || "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-6 text-center text-stone-400">
                      No tasks found for this week. Click &quot;Add Task&quot; above to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
