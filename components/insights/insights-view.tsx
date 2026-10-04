"use client";

import { InsightsDataset } from "@/lib/insights/types";
import { InsightsRangeSelector } from "./insights-range-selector";
import { InsightsOverview } from "./insights-overview";
import { ExecutionTrendChart } from "./execution-trend-chart";
import { CommitmentCompletionChart } from "./commitment-completion-chart";
import { CarryoverTrendChart } from "./carryover-trend-chart";
import { BlockerTrendChart } from "./blocker-trend-chart";
import { GoalExecutionChart } from "./goal-execution-chart";
import { WorkloadTable } from "./workload-table";
import { InsightSignals } from "./insight-signals";
import { MemberInsightsView } from "./member-insights-view";
import { BarChart3, Info } from "lucide-react";

interface InsightsViewProps {
  dataset: InsightsDataset;
}

export function InsightsView({ dataset }: InsightsViewProps) {
  const {
    range,
    isAdmin,
    selectedMemberId,
    selectedMemberProfile,
    teamMembers,
    weeklyTasks,
    weeklyGoals,
    weeklyCarryovers,
    weeklyBlockers,
    recurringBlockers,
    workload,
    overviewStats,
    comparison,
    signals,
  } = dataset;

  const isMemberFiltered = isAdmin && selectedMemberId !== null;
  const filteredMemberName = selectedMemberProfile
    ? selectedMemberProfile.full_name || selectedMemberProfile.email
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              {isAdmin ? (
                isMemberFiltered ? (
                  <>Execution Insights · <span className="text-muted-foreground font-normal">{filteredMemberName}</span></>
                ) : (
                  "Startup Execution Insights"
                )
              ) : (
                "My Insights"
              )}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isAdmin
              ? "Historical velocity trends, commitment completion rates, carryovers, and team workload distribution."
              : "Personal completion trends, task carryovers, blocker history, and contributed goals."}
          </p>
        </div>

        {isMemberFiltered && (
          <div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 px-3 py-1.5 rounded-md">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Filtering insights by member: <strong>{filteredMemberName}</strong></span>
          </div>
        )}
      </div>

      {/* Range and Member Filter Controls */}
      <InsightsRangeSelector
        range={range}
        isAdmin={isAdmin}
        teamMembers={teamMembers}
        selectedMemberId={selectedMemberId}
      />

      {/* Branch for Member vs Admin */}
      {!isAdmin ? (
        <MemberInsightsView dataset={dataset} />
      ) : (
        <div className="space-y-6">
          {/* 1. Overview Metric Stats & WoW Comparison */}
          <InsightsOverview
            stats={overviewStats}
            comparison={comparison}
          />

          {/* 2. Attention Signals */}
          <InsightSignals signals={signals} />

          {/* 3. Section 2 & 3: Weekly Execution Trend & Commitment vs Completion */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ExecutionTrendChart data={weeklyTasks} />
            <CommitmentCompletionChart data={weeklyTasks} />
          </div>

          {/* 4. Section 4 & 5: Carryovers & Blocker Patterns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CarryoverTrendChart data={weeklyCarryovers} />
            <BlockerTrendChart
              weeklyBlockers={weeklyBlockers}
              recurringBlockers={recurringBlockers}
            />
          </div>

          {/* 5. Section 6: Goal Execution */}
          <GoalExecutionChart data={weeklyGoals} />

          {/* 6. Section 7: Workload Distribution Table (Admin only) */}
          <WorkloadTable workload={workload} />
        </div>
      )}
    </div>
  );
}
