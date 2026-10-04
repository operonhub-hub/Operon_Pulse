"use client";

import { WeeklyCarryoverMetric } from "@/lib/insights/types";
import { CornerDownRight } from "lucide-react";

interface CarryoverTrendChartProps {
  data: WeeklyCarryoverMetric[];
}

export function CarryoverTrendChart({ data }: CarryoverTrendChartProps) {
  if (!data || data.length === 0) {
    return null;
  }

  const maxVal = Math.max(...data.map((d) => d.carryoversOut), 4);
  const height = 180;
  const paddingX = 40;
  const paddingY = 24;
  const width = Math.max(500, data.length * 60);

  return (
    <div className="p-5 bg-card border border-border rounded-lg space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CornerDownRight className="w-4 h-4 text-amber-500" /> Carryover & Rollover Patterns
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tasks rolled forward into subsequent weeks vs repeated multi-week carryovers
        </p>
      </div>

      <div className="w-full overflow-x-auto pb-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[500px]"
          aria-label="Carryover Trend Bar Chart"
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

          {/* Carryover Bars */}
          {data.map((d, i) => {
            const x = paddingX + (i * (width - paddingX * 2)) / Math.max(1, data.length - 1);
            const barWidth = 20;

            const totalHeight = (d.carryoversOut / maxVal) * (height - paddingY * 2);
            const barY = height - paddingY - totalHeight;

            // Repeated carryover portion
            const repeatedHeight = (d.repeatedCarryovers / maxVal) * (height - paddingY * 2);
            const repeatedY = height - paddingY - repeatedHeight;

            const weekShort = d.formattedWeek.split("·")[0].trim();

            return (
              <g key={d.weekStart}>
                {/* Total Carryovers Out bar */}
                <rect
                  x={x - barWidth / 2}
                  y={barY}
                  width={barWidth}
                  height={totalHeight}
                  rx="3"
                  className="fill-amber-400 dark:fill-amber-500"
                />

                {/* Repeated portion (highlighted in red/orange) */}
                {d.repeatedCarryovers > 0 && (
                  <rect
                    x={x - barWidth / 2}
                    y={repeatedY}
                    width={barWidth}
                    height={repeatedHeight}
                    rx="3"
                    className="fill-rose-500"
                  />
                )}

                {/* Value label */}
                {d.carryoversOut > 0 ? (
                  <text
                    x={x}
                    y={barY - 4}
                    textAnchor="middle"
                    className="fill-foreground text-[10px] font-semibold"
                  >
                    {d.carryoversOut}
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
          <span className="w-3 h-3 bg-amber-400 dark:bg-amber-500 rounded-sm inline-block" />
          <span>Carryovers Out</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-rose-500 rounded-sm inline-block" />
          <span>Repeated Carryovers (Rollover ≥ 2)</span>
        </div>
      </div>
    </div>
  );
}
