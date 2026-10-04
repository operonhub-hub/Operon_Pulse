"use client";

import { useState } from "react";
import { WorkloadMetric } from "@/lib/insights/types";
import { Users, User, ArrowUpDown } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

interface WorkloadTableProps {
  workload: WorkloadMetric[];
}

export function WorkloadTable({ workload }: WorkloadTableProps) {
  const [sortBy, setSortBy] = useState<"name" | "planned" | "active" | "blocked">("name");
  const [sortAsc, setSortAsc] = useState(true);

  if (!workload || workload.length === 0) {
    return null;
  }

  const handleSort = (field: "name" | "planned" | "active" | "blocked") => {
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
              </tr>
            ))}
          </tbody>
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
