"use client";

import { useState } from "react";
import { TeamContributionTotals, WorkloadMetric } from "@/lib/insights/types";
import { Users, User, ArrowUpDown } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

interface WorkloadTableProps {
  workload: WorkloadMetric[];
  teamTotals?: TeamContributionTotals | null;
}

type SortField = "name" | "planned" | "active" | "blocked" | "supported" | "contributions";

export function WorkloadTable({ workload, teamTotals }: WorkloadTableProps) {
  const [sortBy, setSortBy] = useState<SortField>("name");
  const [sortAsc, setSortAsc] = useState(true);

  if (!workload || workload.length === 0) {
    return null;
  }

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(field === "name"); // name default asc, numbers default desc
    }
  };

  const sortedWorkload = [...workload].sort((a, b) => {
    if (sortBy === "name") {
      return sortAsc
        ? a.memberName.localeCompare(b.memberName)
        : b.memberName.localeCompare(a.memberName);
    }
    const valA = a[sortBy];
    const valB = b[sortBy];
    return sortAsc ? valA - valB : valB - valA;
  });

  return (
    <div className="p-5 bg-card border border-border rounded-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Team Workload Distribution
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational capacity and task status across team members during this timeframe
          </p>
        </div>
        <span className="text-[11px] text-muted-foreground italic">
          Admin workload visibility · Alphabetical by default
        </span>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto border border-border rounded-md">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th
                onClick={() => handleSort("name")}
                className="p-3 font-medium cursor-pointer hover:text-foreground select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Team Member</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3 font-medium">Role</th>
              <th
                onClick={() => handleSort("planned")}
                className="p-3 font-medium cursor-pointer hover:text-foreground select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Planned</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3 font-medium">Done</th>
              <th
                onClick={() => handleSort("active")}
                className="p-3 font-medium cursor-pointer hover:text-foreground select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Active</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("blocked")}
                className="p-3 font-medium cursor-pointer hover:text-foreground select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Blocked</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3 font-medium">Critical</th>
              <th className="p-3 font-medium">Completion Rate</th>
              {/* Support columns (secondary colour) */}
              <th
                onClick={() => handleSort("supported")}
                className="p-3 font-medium bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200 cursor-pointer select-none border-l border-violet-200 dark:border-violet-900"
              >
                <div className="flex items-center gap-1">
                  <span>Supported</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3 font-medium bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">Supp. Done</th>
              <th className="p-3 font-medium bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">Supp. Rate</th>
              <th
                onClick={() => handleSort("contributions")}
                className="p-3 font-medium bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200 cursor-pointer select-none"
                title="Owned completed + supported completed"
              >
                <div className="flex items-center gap-1">
                  <span>Contributions</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedWorkload.map((m) => (
              <tr key={m.memberId} className="hover:bg-muted/30">
                <td className="p-3 font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={m.avatarUrl || undefined}
                      fallback={m.memberName.slice(0, 2).toUpperCase()}
                      size="sm"
                      className="w-6 h-6 text-[10px]"
                    />
                    <span>{m.memberName}</span>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground">
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted border border-border">
                    {m.role}
                  </span>
                </td>
                <td className="p-3 text-foreground font-semibold">{m.planned}</td>
                <td className="p-3 text-emerald-600 font-medium">{m.completed}</td>
                <td className="p-3 text-blue-600">{m.active}</td>
                <td className="p-3">
                  {m.blocked > 0 ? (
                    <span className="font-semibold text-red-600">{m.blocked}</span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </td>
                <td className="p-3">
                  {m.critical > 0 ? (
                    <span className="font-semibold text-red-700 dark:text-red-400">{m.critical}</span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </td>
                <td className="p-3 font-medium text-foreground">
                  {m.completionRate !== null ? `${m.completionRate}%` : "—"}
                </td>
                <td className="p-3 bg-violet-50/40 text-violet-800 font-semibold border-l border-violet-200 dark:bg-violet-950/20 dark:text-violet-300 dark:border-violet-900">
                  {m.supported}
                </td>
                <td className="p-3 bg-violet-50/40 text-violet-700 dark:bg-violet-950/20 dark:text-violet-300">
                  {m.supportedCompleted}
                </td>
                <td className="p-3 bg-violet-50/40 text-violet-700 dark:bg-violet-950/20 dark:text-violet-300">
                  {m.supportCompletionRate !== null ? `${m.supportCompletionRate}%` : "—"}
                </td>
                <td className="p-3 bg-violet-50/40 font-bold text-violet-900 dark:bg-violet-950/20 dark:text-violet-100">
                  {m.contributions}
                </td>
              </tr>
            ))}
          </tbody>
          {teamTotals && (
            <tfoot className="border-t-2 border-border bg-muted/40 text-[11px]">
              <tr>
                <td colSpan={12} className="p-3 text-muted-foreground">
                  <span className="font-semibold text-foreground">Team totals (each task counted once):</span>{" "}
                  {teamTotals.completedTasks} tasks completed, of which {teamTotals.completedWithSupport} had a
                  support person. {teamTotals.supportedTasks} tasks had support in total. Member contributions add
                  up to {teamTotals.sumOfMemberContributions} because a supported task credits both its owner and
                  its supporter.
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-2.5 md:hidden">
        {sortedWorkload.map((m) => (
          <div key={m.memberId} className="p-3 bg-muted/30 border border-border rounded-md text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-[11px]">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-foreground">{m.memberName}</span>
              </div>
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-muted border border-border">
                {m.role}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-md bg-violet-50/60 p-2 text-center dark:bg-violet-950/20">
              <div>
                <span className="text-[10px] text-violet-700 block dark:text-violet-300">Supported</span>
                <span className="font-bold text-violet-800 dark:text-violet-200">{m.supported}</span>
              </div>
              <div>
                <span className="text-[10px] text-violet-700 block dark:text-violet-300">Supp. Done</span>
                <span className="font-bold text-violet-800 dark:text-violet-200">{m.supportedCompleted}</span>
              </div>
              <div>
                <span className="text-[10px] text-violet-700 block dark:text-violet-300">Contributions</span>
                <span className="font-bold text-violet-900 dark:text-violet-100">{m.contributions}</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-1 border-t border-border text-center">
              <div>
                <span className="text-[10px] text-muted-foreground block">Planned</span>
                <span className="font-bold text-foreground">{m.planned}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Done</span>
                <span className="font-bold text-emerald-600">{m.completed}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Active</span>
                <span className="font-bold text-blue-600">{m.active}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Blocked</span>
                <span className="font-bold text-red-600">{m.blocked}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
