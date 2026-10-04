"use client";

import { useState } from "react";
import { WeeklyTaskMetric } from "@/lib/insights/types";
import { TrendingUp, Table as TableIcon } from "lucide-react";

interface ExecutionTrendChartProps {
  data: WeeklyTaskMetric[];
}

export function ExecutionTrendChart({ data }: ExecutionTrendChartProps) {
  const [showTable, setShowTable] = useState(false);

  if (!data || data.length === 0) {
    return (
      <div className="p-6 bg-card border border-border rounded-lg text-center text-muted-foreground text-sm">
        No task execution history available for this timeframe.
      </div>
    );
  }

  // SVG dimensions
  const height = 220;
  const paddingX = 40;
  const paddingY = 24;
  const width = Math.max(500, data.length * 60);

  const maxPlanned = Math.max(...data.map((d) => d.plannedTasks), 5);

  // Compute SVG coordinates for completion rate line
  const points = data.map((d, i) => {
    const x = paddingX + (i * (width - paddingX * 2)) / Math.max(1, data.length - 1);
    const rate = d.completionRate !== null ? d.completionRate : 0;
    const y = height - paddingY - (rate / 100) * (height - paddingY * 2);
    return { x, y, d, rate: d.completionRate };
  });

  const linePath = points
    .filter((p) => p.rate !== null)
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <div className="p-5 bg-card border border-border rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" /> Weekly Completion Rate Trend
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Percentage of committed tasks marked Done each weekly cycle
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2.5 py-1 rounded border border-border bg-background"
        >
          <TableIcon className="w-3.5 h-3.5" />
          {showTable ? "Hide Data Table" : "View Data Table"}
        </button>
      </div>

      {/* Accessible visual SVG chart */}
      <div className="w-full overflow-x-auto pb-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[500px]"
          aria-label="Weekly Completion Rate Trend Chart"
        >
          {/* Y-axis gridlines & labels */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = height - paddingY - (pct / 100) * (height - paddingY * 2);
            return (
              <g key={pct}>
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
                  {pct}%
                </text>
              </g>
            );
          })}

          {/* Planned task volume background bars */}
          {data.map((d, i) => {
            const x = paddingX + (i * (width - paddingX * 2)) / Math.max(1, data.length - 1);
            const barWidth = 24;
            const barHeight = (d.plannedTasks / maxPlanned) * (height - paddingY * 2) * 0.4; // subtle lower half
            const barY = height - paddingY - barHeight;

            return (
              <g key={d.weekStart}>
                <rect
                  x={x - barWidth / 2}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  rx="3"
                  className="fill-muted/60"
                />
              </g>
            );
          })}

          {/* Trend Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#059669"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Points & Labels */}
          {points.map((p) => {
            const weekShort = p.d.formattedWeek.split("·")[0].trim();
            return (
              <g key={p.d.weekStart} className="group">
                {p.rate !== null ? (
                  <>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="4.5"
                      fill="#059669"
                      stroke="white"
                      strokeWidth="2"
                    />
                    <text
                      x={p.x}
                      y={p.y - 8}
                      textAnchor="middle"
                      className="fill-foreground text-[11px] font-semibold"
                    >
                      {p.rate}%
                    </text>
                  </>
                ) : (
                  <text
                    x={p.x}
                    y={height - paddingY - 12}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[10px] italic"
                  >
                    No tasks
                  </text>
                )}

                {/* X-axis label */}
                <text
                  x={p.x}
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
          <span className="w-3 h-0.5 bg-emerald-600 rounded-full inline-block" />
          <span>Completion Rate (%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-muted/80 rounded-sm inline-block" />
          <span>Volume Indicator (Planned Tasks)</span>
        </div>
      </div>

      {/* Accessible Table */}
      {showTable && (
        <div className="overflow-x-auto border border-border rounded-md mt-3">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="p-2 font-medium">Week</th>
                <th className="p-2 font-medium">Planned</th>
                <th className="p-2 font-medium">Done</th>
                <th className="p-2 font-medium">Completion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((d) => (
                <tr key={d.weekStart} className="hover:bg-muted/30">
                  <td className="p-2 font-medium text-foreground">{d.formattedWeek}</td>
                  <td className="p-2 text-muted-foreground">{d.plannedTasks}</td>
                  <td className="p-2 text-muted-foreground">{d.completedTasks}</td>
                  <td className="p-2 font-semibold text-emerald-600">
                    {d.completionRate !== null ? `${d.completionRate}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
