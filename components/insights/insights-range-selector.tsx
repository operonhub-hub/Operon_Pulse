"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Users } from "lucide-react";
import { Profile } from "@/types";
import { InsightsRange } from "@/lib/insights/types";

interface InsightsRangeSelectorProps {
  range: InsightsRange;
  isAdmin: boolean;
  teamMembers: Profile[];
  selectedMemberId: string | null;
}

export function InsightsRangeSelector({
  range,
  isAdmin,
  teamMembers,
  selectedMemberId,
}: InsightsRangeSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePreset = (preset: "4w" | "8w" | "12w") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("preset", preset);
    params.delete("from");
    params.delete("to");
    router.push(`/insights?${params.toString()}`);
  };

  const handleCustomDateChange = (type: "from" | "to", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("preset");
    if (value) {
      params.set(type, value);
    } else {
      params.delete(type);
    }
    router.push(`/insights?${params.toString()}`);
  };

  const handleMemberChange = (memberId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (memberId === "ALL") {
      params.delete("member");
    } else {
      params.set("member", memberId);
    }
    router.push(`/insights?${params.toString()}`);
  };

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-card border border-border rounded-lg">
      {/* Presets */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mr-1">
          <Calendar className="w-3.5 h-3.5" /> Range:
        </span>
        <button
          type="button"
          onClick={() => handlePreset("4w")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
            range.preset === "4w"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-foreground border-border hover:bg-muted"
          }`}
        >
          Last 4 Weeks
        </button>
        <button
          type="button"
          onClick={() => handlePreset("8w")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
            range.preset === "8w"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-foreground border-border hover:bg-muted"
          }`}
        >
          Last 8 Weeks
        </button>
        <button
          type="button"
          onClick={() => handlePreset("12w")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
            range.preset === "12w"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-foreground border-border hover:bg-muted"
          }`}
        >
          Last 12 Weeks
        </button>
      </div>

      {/* Date Pickers & Member Filter */}
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
        <div className="flex items-center gap-1.5 text-xs">
          <label htmlFor="from-date" className="text-muted-foreground font-medium">
            From:
          </label>
          <input
            id="from-date"
            type="date"
            value={range.from}
            onChange={(e) => handleCustomDateChange("from", e.target.value)}
            className="px-2 py-1 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <label htmlFor="to-date" className="text-muted-foreground font-medium">
            To:
          </label>
          <input
            id="to-date"
            type="date"
            value={range.to}
            onChange={(e) => handleCustomDateChange("to", e.target.value)}
            className="px-2 py-1 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Admin Member Filter */}
        {isAdmin && teamMembers.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs pl-2 border-l border-border">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={selectedMemberId || "ALL"}
              onChange={(e) => handleMemberChange(e.target.value)}
              className="px-2.5 py-1 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              aria-label="Filter by team member"
            >
              <option value="ALL">All Team Members</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name || member.email}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
