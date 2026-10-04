"use client";

import { WeeklyGoalMetric } from "@/lib/insights/types";
import { Target } from "lucide-react";

interface GoalExecutionChartProps {
  data: WeeklyGoalMetric[];
}

export function GoalExecutionChart({ data }: GoalExecutionChartProps) {
  if (!data || data.length === 0) {
    return null;
  }

  const maxVal = Math.max(...data.map((d) => d.goalsCommitted), 3);
  const height = 180;
  const paddingX = 40;
  const paddingY = 24;
  const width = Math.max(500, data.length * 60);

  return (
    <div className="p-5 bg-card border border-border rounded-lg space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-500" /> Goal Execution & Achievement
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Strategic outcomes committed vs goals achieved per weekly cycle
        </p>
      </div>

      <div className="w-full overflow-x-auto pb-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[500px]"
          aria-label="Goal Execution Bar Chart"
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

          {/* Goal Bars */}
          {data.map((d, i) => {
            const x = paddingX + (i * (width - paddingX * 2)) / Math.max(1, data.length - 1);
            const barWidth = 18;

            const committedHeight = (d.goalsCommitted / maxVal) * (height - paddingY * 2);
            const barY = height - paddingY - committedHeight;

            // Achieved portion
            const achievedHeight = (d.goalsAchieved / maxVal) * (height - paddingY * 2);
            const achievedY = height - paddingY - achievedHeight;

            const weekShort = d.formattedWeek.split("·")[0].trim();

            return (
              <g key={d.weekStart}>
                {/* Committed bar */}
                <rect
                  x={x - barWidth / 2}
                  y={barY}
                  width={barWidth}
                  height={committedHeight}
                  rx="3"
                  className="fill-blue-200 dark:fill-blue-950/60"
                />

                {/* Achieved portion */}
                {d.goalsAchieved > 0 && (
                  <rect
                    x={x - barWidth / 2}
                    y={achievedY}
                    width={barWidth}
                    height={achievedHeight}
                    rx="3"
                    className="fill-blue-600 dark:fill-blue-500"
                  />
                )}

                {/* Value label */}
                {d.goalsCommitted > 0 ? (
                  <text
                    x={x}
                    y={barY - 4}
                    textAnchor="middle"
                    className="fill-foreground text-[10px] font-semibold"
                  >
                    {d.goalsAchieved}/{d.goalsCommitted}
                  </text>
                ) : (
                  <text
                    x={x}
                    y={height - paddingY - 4}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[10px]"
                  >
                    —
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
          <span className="w-3 h-3 bg-blue-200 dark:bg-blue-950/60 rounded-sm inline-block" />
          <span>Goals Committed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-blue-600 rounded-sm inline-block" />
          <span>Goals Achieved</span>
        </div>
      </div>
    </div>
  );
}
