"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar, Sparkles, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWeekContextInfo } from "@/lib/utils/week";

interface WeekNavigatorProps {
  currentWeekMonday: string;
}

export function WeekNavigator({ currentWeekMonday }: WeekNavigatorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const weekInfo = getWeekContextInfo(currentWeekMonday);

  const navigateToWeek = (targetMonday: string, resetToActive: boolean = false) => {
    const params = new URLSearchParams(searchParams.toString());
    if (resetToActive) {
      params.delete("week");
    } else {
      params.set("week", targetMonday);
    }
    const query = params.toString();
    const destination = query ? `${pathname}?${query}` : pathname;
    router.push(destination);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white p-3 sm:px-4 shadow-2xs">
      {/* Week Title & Indicator Badge */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg border shrink-0 ${
            weekInfo.isPlanningWeek
              ? "bg-amber-50 text-amber-800 border-amber-200/70 dark:bg-amber-950/40 dark:border-amber-900/60"
              : weekInfo.isPastWeek
              ? "bg-zinc-100 text-zinc-700 border-zinc-200/70 dark:bg-zinc-800 dark:border-zinc-700"
              : "bg-emerald-50 text-emerald-800 border-emerald-200/70 dark:bg-emerald-950/40 dark:border-emerald-900/60"
          }`}
        >
          {weekInfo.isPlanningWeek ? (
            <Sparkles className="h-4 w-4 text-amber-600" />
          ) : weekInfo.isPastWeek ? (
            <History className="h-4 w-4 text-zinc-600" />
          ) : (
            <Calendar className="h-4 w-4 text-emerald-600" />
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold tracking-tight text-zinc-900 truncate">
              Week {weekInfo.weekNumber} · {weekInfo.dateRange}
            </span>

            {/* Status Badge */}
            {weekInfo.isCurrentWeek ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/70">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active Week
              </span>
            ) : weekInfo.isPlanningWeek ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200/70">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Planning Week
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 border border-zinc-200/70">
                Past Week
              </span>
            )}
          </div>

          <span className="text-[11px] text-zinc-500 truncate">
            {weekInfo.isPlanningWeek
              ? "Forward planning cycle · Monday – Sunday"
              : weekInfo.isPastWeek
              ? "Archived execution sprint"
              : "Live sprint cycle: Monday – Sunday"}
          </span>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => navigateToWeek(weekInfo.previousMonday)}
          aria-label="Previous week"
          title="Previous week"
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4 text-zinc-600" />
        </Button>

        {!weekInfo.isCurrentWeek && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateToWeek(weekInfo.activeMonday, true)}
            aria-label="Jump to active week"
            className="h-8 px-2.5 text-xs font-medium text-amber-700 hover:text-amber-800 hover:bg-amber-50 border border-amber-200/50"
          >
            This Week
          </Button>
        )}

        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => navigateToWeek(weekInfo.nextMonday)}
          aria-label="Next week"
          title="Next week"
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4 text-zinc-600" />
        </Button>
      </div>
    </div>
  );
}
