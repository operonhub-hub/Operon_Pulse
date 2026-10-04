"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getMondayDateString,
  getPreviousWeekMonday,
  getNextWeekMonday,
  formatWeekLabelFromMonday,
} from "@/lib/utils/date";

interface WeekNavigatorProps {
  currentWeekMonday: string;
}

export function WeekNavigator({ currentWeekMonday }: WeekNavigatorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentActualMonday = getMondayDateString();

  const isCurrentWeek = currentWeekMonday === currentActualMonday;
  const weekLabel = formatWeekLabelFromMonday(currentWeekMonday);

  const navigateToWeek = (mondayStr: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("week", mondayStr);
    router.push(`/my-tasks?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white p-3 sm:px-4 shadow-2xs">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-800 border border-amber-200/60">
          <Calendar className="h-4 w-4 text-amber-600" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-zinc-900">
              {weekLabel}
            </span>
            {isCurrentWeek && (
              <span className="rounded-md bg-emerald-50 px-2 py-0.2 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                Active Week
              </span>
            )}
          </div>
          <span className="text-[11px] text-zinc-500">
            Sprint cycle: Monday – Sunday
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => navigateToWeek(getPreviousWeekMonday(currentWeekMonday))}
          aria-label="Previous week"
          title="Previous week"
        >
          <ChevronLeft className="h-4 w-4 text-zinc-600" />
        </Button>

        {!isCurrentWeek && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateToWeek(currentActualMonday)}
            className="text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50"
          >
            This Week
          </Button>
        )}

        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => navigateToWeek(getNextWeekMonday(currentWeekMonday))}
          aria-label="Next week"
          title="Next week"
        >
          <ChevronRight className="h-4 w-4 text-zinc-600" />
        </Button>
      </div>
    </div>
  );
}
