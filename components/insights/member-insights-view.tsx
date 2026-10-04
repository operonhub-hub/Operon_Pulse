"use client";

import { InsightsDataset } from "@/lib/insights/types";
import { InsightsOverview } from "./insights-overview";
import { ExecutionTrendChart } from "./execution-trend-chart";
import { CommitmentCompletionChart } from "./commitment-completion-chart";
import { CarryoverTrendChart } from "./carryover-trend-chart";
import { BlockerTrendChart } from "./blocker-trend-chart";
import { InsightSignals } from "./insight-signals";
import { Target, CheckCircle2 } from "lucide-react";

interface MemberInsightsViewProps {
  dataset: InsightsDataset;
}

export function MemberInsightsView({ dataset }: MemberInsightsViewProps) {
  const {
    weeklyTasks,
    weeklyCarryovers,
    weeklyBlockers,
    recurringBlockers,
    overviewStats,
    comparison,
    signals,
    contributedGoals,
  } = dataset;

  return (
    <div className="space-y-6">
      {/* 1. Overview Metric Stats & WoW Banner */}
      <InsightsOverview stats={overviewStats} comparison={comparison} />

      {/* 2. Attention Signals */}
      <InsightSignals signals={signals} />

      {/* 3. Primary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExecutionTrendChart data={weeklyTasks} />
        <CommitmentCompletionChart data={weeklyTasks} />
      </div>

      {/* 4. Carryovers & Blockers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CarryoverTrendChart data={weeklyCarryovers} />
        <BlockerTrendChart
          weeklyBlockers={weeklyBlockers}
          recurringBlockers={recurringBlockers}
        />
      </div>

      {/* 5. Contributed Goals */}
      {contributedGoals && contributedGoals.length > 0 && (
        <div className="p-5 bg-card border border-border rounded-lg space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-500" /> Goals Contributed To
          </h3>
          <p className="text-xs text-muted-foreground">
            Strategic company goals linked to your tasks during this timeframe
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {contributedGoals.map((goal) => (
              <div
                key={goal.id}
                className="p-3 bg-muted/40 border border-border rounded-md text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground truncate">{goal.title}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      goal.status === "ACHIEVED"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                        : goal.status === "ON_TRACK"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                    }`}
                  >
                    {goal.status.replace("_", " ")}
                  </span>
                </div>
                {goal.description && (
                  <p className="text-muted-foreground line-clamp-2">{goal.description}</p>
                )}
                <div className="text-[10px] text-muted-foreground pt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Week starting {goal.week_start}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
