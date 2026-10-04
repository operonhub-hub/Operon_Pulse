"use client";

import { WeeklyTaskMetric } from "@/lib/insights/types";
import { Layers } from "lucide-react";

interface CommitmentCompletionChartProps {
  data: WeeklyTaskMetric[];
}

export function CommitmentCompletionChart({ data }: CommitmentCompletionChartProps) {
  if (!data || data.length === 0) {
    return null;
  }

  const maxVal = Math.max(...data.map((d) => Math.max(d.plannedTasks, d.completedTasks)), 5);
  const height = 200;
  const paddingX = 40;
  const paddingY = 24;
  const width = Math.max(500, data.length * 60);

  return (
    <div className="p-5 bg-card border border-border rounded-lg space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" /> Commitment vs. Completion
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tasks planned at sprint start compared to tasks delivered Done
        </p>
      </div>

      <div className="w-full overflow-x-auto pb-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[500px]"
          aria-label="Commitment vs Completion Grouped Bar Chart"
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

          {/* Grouped Bars */}
          {data.map((d, i) => {
            const groupCenterX =
              paddingX + (i * (width - paddingX * 2)) / Math.max(1, data.length - 1);
            const barWidth = 14;
            const gap = 3;

            // Planned bar (left)
            const plannedHeight = (d.plannedTasks / maxVal) * (height - paddingY * 2);
            const plannedY = height - paddingY - plannedHeight;

            // Completed bar (right)
            const completedHeight = (d.completedTasks / maxVal) * (height - paddingY * 2);
            const completedY = height - paddingY - completedHeight;

            const weekShort = d.formattedWeek.split("·")[0].trim();

            return (
              <g key={d.weekStart}>
                {/* Planned bar */}
                <rect
                  x={groupCenterX - barWidth - gap / 2}
                  y={plannedY}
                  width={barWidth}
                  height={plannedHeight}
                  rx="2"
                  className="fill-zinc-300 dark:fill-zinc-700"
                />
                {d.plannedTasks > 0 && (
                  <text
                    x={groupCenterX - barWidth / 2 - gap / 2}
                    y={plannedY - 4}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[10px] font-medium"
                  >
                    {d.plannedTasks}
                  </text>
                )}

                {/* Completed bar */}
                <rect
                  x={groupCenterX + gap / 2}
                  y={completedY}
                  width={barWidth}
                  height={completedHeight}
                  rx="2"
                  className="fill-emerald-600 dark:fill-emerald-500"
                />
                {d.completedTasks > 0 && (
                  <text
                    x={groupCenterX + barWidth / 2 + gap / 2}
                    y={completedY - 4}
                    textAnchor="middle"
                    className="fill-emerald-600 dark:fill-emerald-400 text-[10px] font-semibold"
                  >
                    {d.completedTasks}
                  </text>
                )}

                {/* X-axis label */}
                <text
                  x={groupCenterX}
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
          <span className="w-3 h-3 bg-zinc-300 dark:bg-zinc-700 rounded-sm inline-block" />
          <span>Planned Tasks</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-emerald-600 rounded-sm inline-block" />
          <span>Completed Tasks (Done)</span>
        </div>
      </div>
    </div>
  );
}
