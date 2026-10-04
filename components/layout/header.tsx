"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getCurrentWeekLabel } from "@/lib/utils/date";
import { UserProfile } from "@/types";

import { AttentionBell } from "@/components/attention/attention-bell";
import { AttentionCenterData } from "@/lib/attention/types";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/my-tasks": "My Tasks",
  "/team-board": "Team Board",
  "/goals": "Weekly Goals",
  "/insights": "Execution Insights",
  "/team": "Team Members",
  "/settings": "Settings & Account",
  "/weekly-review": "Weekly Review",
};

interface HeaderProps {
  user?: UserProfile;
  attentionData?: AttentionCenterData;
}

export function Header({ user, attentionData }: HeaderProps) {
  const pathname = usePathname();
  const title = pageTitles[pathname] || "Workspace";
  const [weekLabel, setWeekLabel] = React.useState<string>("");
  const initials = user?.initials || "DP";

  React.useEffect(() => {
    setWeekLabel(getCurrentWeekLabel());
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-zinc-200/80 bg-white/95 px-4 backdrop-blur-xs sm:px-6 lg:px-8">
      {/* Left: Mobile Nav & Page Title */}
      <div className="flex items-center gap-3">
        <MobileNav user={user} />
        <div className="flex items-center gap-3">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900">
            {title}
          </h1>
          {/* Week Indicator Badge */}
          {weekLabel && (
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50/70 px-3 py-1 text-xs font-semibold text-amber-900 shadow-2xs">
              <Calendar className="h-3.5 w-3.5 text-amber-600" />
              <span>{weekLabel}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions & User */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Week Indicator for mobile */}
        {weekLabel && (
          <div className="inline-flex sm:hidden items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
            <span>{weekLabel.split("·")[0]}</span>
          </div>
        )}

        {/* Search Placeholder Button */}
        <button
          type="button"
          aria-label="Search workspace"
          className="hidden sm:flex items-center gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-3 py-1.5 text-xs text-zinc-600 shadow-2xs transition-colors hover:border-zinc-300 hover:bg-zinc-100/70 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
        >
          <Search className="h-3.5 w-3.5 text-zinc-600" />
          <span>Quick search...</span>
          <kbd className="pointer-events-none ml-2 hidden lg:inline-flex h-4 items-center rounded border border-zinc-200 bg-white px-1.5 font-mono text-[10px] font-medium text-zinc-600">
            ⌘K
          </kbd>
        </button>

        {/* Mobile Search Icon Button */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="sm:hidden text-zinc-600 hover:text-zinc-900"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Attention Center Header Bell */}
        <AttentionBell initialData={attentionData} />

        <div className="h-4 w-px bg-zinc-200 mx-0.5" />

        {/* User Avatar with Link to Settings */}
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            title={`${user?.name || "Account"} (${user?.role || "MEMBER"})`}
            className="rounded-full ring-2 ring-transparent hover:ring-zinc-300 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <Avatar
              fallback={initials}
              size="sm"
              className="cursor-pointer bg-zinc-900 text-amber-400 font-semibold"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
