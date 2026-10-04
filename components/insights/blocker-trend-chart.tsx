"use client";

import { WeeklyBlockerMetric, RecurringBlockerItem } from "@/lib/insights/types";
import { AlertOctagon, MessageSquare } from "lucide-react";

interface BlockerTrendChartProps {
  weeklyBlockers: WeeklyBlockerMetric[];
  recurringBlockers: RecurringBlockerItem[];
}

export function BlockerTrendChart({
  weeklyBlockers,
  recurringBlockers,
}: BlockerTrendChartProps) {
  if (!weeklyBlockers || weeklyBlockers.length === 0) {
    return null;
  }

  const maxVal = Math.max(...weeklyBlockers.map((d) => d.blockedTasks), 4);
  const height = 180;
  const paddingX = 40;
  const paddingY = 24;
  const width = Math.max(500, weeklyBlockers.length * 60);

  return (
    <div className="p-5 bg-card border border-border rounded-lg space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-red-500" /> Blocker Frequency & Critical Obstacles
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Weekly count of blocked tasks and critical blockers needing team unblocking
        </p>
      </div>

      <div className="w-full overflow-x-auto pb-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[500px]"
          aria-label="Blocker Frequency Bar Chart"
        >
          {/* Y-axis gridlines */}
          {[0, Math.round(maxVal / 2), maxVal].map((val) => {
            const y = height - paddingY - (val / maxVal) * (height - paddingY * 2);
            return (
              <g key={val}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="currentColor"
                  className="text-border"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-muted-foreground text-[10px] font-mono"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Blocker Bars */}
          {weeklyBlockers.map((d, i) => {
            const x = paddingX + (i * (width - paddingX * 2)) / Math.max(1, weeklyBlockers.length - 1);
            const barWidth = 18;

            const totalHeight = (d.blockedTasks / maxVal) * (height - paddingY * 2);
            const barY = height - paddingY - totalHeight;

            // Critical portion
            const criticalHeight = (d.criticalBlockers / maxVal) * (height - paddingY * 2);
            const criticalY = height - paddingY - criticalHeight;

            const weekShort = d.formattedWeek.split("·")[0].trim();

            return (
              <g key={d.weekStart}>
                {/* Total Blocked bar */}
                <rect
                  x={x - barWidth / 2}
                  y={barY}
                  width={barWidth}
                  height={totalHeight}
                  rx="3"
                  className="fill-red-200 dark:fill-red-950/60"
                />

                {/* Critical blockers portion */}
                {d.criticalBlockers > 0 && (
                  <rect
                    x={x - barWidth / 2}
                    y={criticalY}
                    width={barWidth}
                    height={criticalHeight}
                    rx="3"
                    className="fill-red-600 dark:fill-red-500"
                  />
                )}

                {/* Value label */}
                {d.blockedTasks > 0 ? (
                  <text
                    x={x}
                    y={barY - 4}
                    textAnchor="middle"
                    className="fill-red-600 dark:fill-red-400 text-[10px] font-semibold"
                  >
                    {d.blockedTasks}
                  </text>
                ) : (
                  <text
                    x={x}
                    y={height - paddingY - 4}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[10px]"
                  >
                    0
                  </text>
                )}

                {/* X-axis label */}
                <text
                  x={x}
                  y={height - 6}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px] font-medium"
                >
                  {weekShort}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground pt-1 border-t border-border">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-red-200 dark:bg-red-950/60 rounded-sm inline-block" />
          <span>All Blocked Tasks</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-red-600 rounded-sm inline-block" />
          <span>Critical Priority Blockers</span>
        </div>
      </div>

      {/* Recurring Blocker Reasons */}
      {recurringBlockers.length > 0 && (
        <div className="pt-2 border-t border-border space-y-2.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Recurring Blocker Notes
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {recurringBlockers.slice(0, 4).map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-muted/40 border border-border rounded-md flex items-start justify-between gap-2 text-xs"
              >
                <span className="text-foreground line-clamp-2">“{item.description}”</span>
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 font-semibold text-[11px] whitespace-nowrap">
                  {item.count} {item.count === 1 ? "occurrence" : "occurrences"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
