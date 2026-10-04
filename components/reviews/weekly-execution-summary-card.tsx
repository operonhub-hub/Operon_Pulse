import * as React from "react";
import {
  Activity,
  AlertOctagon,
  ArrowRightLeft,
  CheckCircle2,
  FileText,
  Target,
} from "lucide-react";
import { WeeklyExecutionSummary } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface WeeklyExecutionSummaryCardProps {
  summary: WeeklyExecutionSummary;
}

export function WeeklyExecutionSummaryCard({
  summary,
}: WeeklyExecutionSummaryCardProps) {
  return (
    <Card className="border-stone-200/80 dark:border-stone-800 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Weekly Execution Summary</CardTitle>
              <CardDescription className="text-xs text-stone-500 dark:text-stone-400">
                Deterministic synthesis of sprint deliverables and outcomes
              </CardDescription>
            </div>
          </div>
          <a
            href={`/insights?to=${summary.weekStart}&preset=8w`}
            className="text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
          >
            <span>View Historical Trends</span>
            <Activity className="h-3 w-3" />
          </a>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Metric Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Completion Rate */}
          <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-3 dark:border-stone-800 dark:bg-stone-900/50">
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
              <span>Task Completion</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-stone-900 dark:text-stone-100">
                {summary.completionRate}%
              </span>
              <span className="text-[11px] text-stone-400">
                ({summary.tasksCompleted}/{summary.totalTasksPlanned})
              </span>
            </div>
          </div>

          {/* Goals Achieved */}
          <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-3 dark:border-stone-800 dark:bg-stone-900/50">
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
              <span>Goals Achieved</span>
              <Target className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {summary.goalsAchievedCount}
              </span>
              <span className="text-[11px] text-stone-400">
                / {summary.totalGoalsCommitted} goals
              </span>
            </div>
          </div>

          {/* Blockers */}
          <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-3 dark:border-stone-800 dark:bg-stone-900/50">
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
              <span>Blockers</span>
              <AlertOctagon className="h-3.5 w-3.5 text-rose-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-rose-600 dark:text-rose-400">
                {summary.blockedTasksCount}
              </span>
              <span className="text-[11px] text-stone-400">unresolved</span>
            </div>
          </div>

          {/* Carried Forward */}
          <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-3 dark:border-stone-800 dark:bg-stone-900/50">
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
              <span>Carried Forward</span>
              <ArrowRightLeft className="h-3.5 w-3.5 text-sky-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-sky-600 dark:text-sky-400">
                {summary.totalCarryovers}
              </span>
              <span className="text-[11px] text-stone-400">to next sprint</span>
            </div>
          </div>
        </div>

        {/* Generated Summary Paragraph */}
        <div className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-4 dark:border-stone-800 dark:bg-stone-950/40">
          <div className="flex items-center gap-1.5 font-semibold text-xs text-stone-700 dark:text-stone-300 mb-1">
            <FileText className="h-3.5 w-3.5 text-stone-400" />
            <span>Sprint Synthesis</span>
          </div>
          <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
            {summary.summaryParagraph}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
