"use client";

import { CheckCircle2, ListTodo, CornerDownRight, AlertOctagon, Target, TrendingUp, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { InsightsOverviewStats, WeekOverWeekComparison } from "@/lib/insights/types";
import { formatWeekLabelFromMonday } from "@/lib/utils/date";

interface InsightsOverviewProps {
  stats: InsightsOverviewStats;
  comparison: WeekOverWeekComparison | null;
}

export function InsightsOverview({
  stats,
  comparison,
}: InsightsOverviewProps) {
  const renderDelta = (
    diff: number | null,
    isPositiveGood: boolean = true,
    unit: string = ""
  ) => {
    if (diff === null || diff === 0) {
      return (
        <span className="inline-flex items-center text-xs text-muted-foreground font-medium">
          <Minus className="w-3 h-3 mr-0.5" /> 0{unit}
        </span>
      );
    }

    const isGood = isPositiveGood ? diff > 0 : diff < 0;
    const colorClass = isGood ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400";
    const Icon = diff > 0 ? ArrowUpRight : ArrowDownRight;
    const sign = diff > 0 ? "+" : "";

    return (
      <span className={`inline-flex items-center text-xs font-medium ${colorClass}`}>
        <Icon className="w-3 h-3 mr-0.5" />
        {sign}{diff}{unit}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* 6 Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Avg Completion Rate */}
        <div className="p-4 bg-card border border-border rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Completion Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {stats.avgCompletionRate !== null ? `${stats.avgCompletionRate}%` : "—"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {stats.totalTasksCompleted} of {stats.totalTasksPlanned} tasks done
            </p>
          </div>
        </div>

        {/* 2. Tasks Planned */}
        <div className="p-4 bg-card border border-border rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Tasks Planned</span>
            <ListTodo className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{stats.totalTasksPlanned}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Across selected range</p>
          </div>
        </div>

        {/* 3. Carryovers Out */}
        <div className="p-4 bg-card border border-border rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Carryovers Out</span>
            <CornerDownRight className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{stats.totalCarryoversOut}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Carried into next week</p>
          </div>
        </div>

        {/* 4. Blocked Tasks */}
        <div className="p-4 bg-card border border-border rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Blocked Tasks</span>
            <AlertOctagon className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{stats.totalBlockedTasks}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Encountered obstacles</p>
          </div>
        </div>

        {/* 5. Goal Achievement */}
        <div className="p-4 bg-card border border-border rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Goal Achieved</span>
            <Target className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {stats.goalAchievementRate !== null ? `${stats.goalAchievementRate}%` : "—"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Strategic goals met</p>
          </div>
        </div>

        {/* 6. Avg Goal Progress */}
        <div className="p-4 bg-card border border-border rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Goal Progress</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {stats.avgGoalProgress !== null ? `${stats.avgGoalProgress}%` : "—"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Average execution depth</p>
          </div>
        </div>
      </div>

      {/* Week-over-Week Comparison Banner */}
      {comparison && (
        <div className="p-3.5 bg-muted/40 border border-border rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold text-[11px] uppercase tracking-wider">
              Week-over-Week
            </span>
            <span className="text-muted-foreground">
              Comparing latest <strong className="text-foreground">{formatWeekLabelFromMonday(comparison.currentWeek).split("·")[0].trim()}</strong> vs prior week:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Planned:</span>
              <span className="font-semibold text-foreground">{comparison.plannedDelta.current}</span>
              {renderDelta(comparison.plannedDelta.diff, true, "")}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Completion:</span>
              <span className="font-semibold text-foreground">
                {comparison.completionRateDelta.current !== null ? `${comparison.completionRateDelta.current}%` : "—"}
              </span>
              {renderDelta(comparison.completionRateDelta.diff, true, " pts")}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Carryovers:</span>
              <span className="font-semibold text-foreground">{comparison.carryoversDelta.current}</span>
              {renderDelta(comparison.carryoversDelta.diff, false, "")}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Blocked:</span>
              <span className="font-semibold text-foreground">{comparison.blockersDelta.current}</span>
              {renderDelta(comparison.blockersDelta.diff, false, "")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
