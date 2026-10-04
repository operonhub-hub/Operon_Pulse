"use client";

import * as React from "react";
import { CheckCircle2, ClipboardCheck, Loader2, Save } from "lucide-react";
import { WeeklyCheckin } from "@/types";
import { saveWeeklyCheckinAction } from "@/lib/reviews/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface WeeklyCheckinCardProps {
  weekStart: string;
  initialCheckin: WeeklyCheckin | null;
}

export function WeeklyCheckinCard({
  weekStart,
  initialCheckin,
}: WeeklyCheckinCardProps) {
  const [completedSummary, setCompletedSummary] = React.useState(
    initialCheckin?.completed_summary || ""
  );
  const [incompleteSummary, setIncompleteSummary] = React.useState(
    initialCheckin?.incomplete_summary || ""
  );
  const [blockersSummary, setBlockersSummary] = React.useState(
    initialCheckin?.blockers_summary || ""
  );
  const [nextWeekFocus, setNextWeekFocus] = React.useState(
    initialCheckin?.next_week_focus || ""
  );

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  React.useEffect(() => {
    setCompletedSummary(initialCheckin?.completed_summary || "");
    setIncompleteSummary(initialCheckin?.incomplete_summary || "");
    setBlockersSummary(initialCheckin?.blockers_summary || "");
    setNextWeekFocus(initialCheckin?.next_week_focus || "");
  }, [initialCheckin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    const res = await saveWeeklyCheckinAction({
      weekStart,
      completedSummary,
      incompleteSummary,
      blockersSummary,
      nextWeekFocus,
    });

    if (res.success) {
      setStatusMessage({
        type: "success",
        text: "Weekly check-in saved successfully.",
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } else {
      setStatusMessage({
        type: "error",
        text: res.error || "Failed to save check-in.",
      });
    }

    setIsSubmitting(false);
  };

  return (
    <Card className="border-stone-200/80 dark:border-stone-800 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
              <ClipboardCheck className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">My Weekly Check-In</CardTitle>
              <CardDescription className="text-xs text-stone-500 dark:text-stone-400">
                Self-reflection and sprint alignment for the week of {weekStart}
              </CardDescription>
            </div>
          </div>

          {initialCheckin && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900 self-start sm:self-auto">
              <CheckCircle2 className="h-3.5 w-3.5" /> Check-in Submitted
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {statusMessage && (
            <div
              className={`flex items-center gap-2 rounded-xl p-3 text-xs border ${
                statusMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
                  : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900"
              }`}
            >
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* 1. What did you complete? */}
          <div className="space-y-1.5">
            <label
              htmlFor="completed-summary"
              className="block font-semibold text-stone-800 dark:text-stone-200"
            >
              1. What did you complete this week?
            </label>
            <textarea
              id="completed-summary"
              rows={2}
              placeholder="Key accomplishments, shipped features, or completed deliverables..."
              value={completedSummary}
              onChange={(e) => setCompletedSummary(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-800 placeholder-stone-400 transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
            />
          </div>

          {/* 2. What did not get completed? */}
          <div className="space-y-1.5">
            <label
              htmlFor="incomplete-summary"
              className="block font-semibold text-stone-800 dark:text-stone-200"
            >
              2. What did not get completed?
            </label>
            <textarea
              id="incomplete-summary"
              rows={2}
              placeholder="Unfinished tasks, delayed workstreams, or deferred scope..."
              value={incompleteSummary}
              onChange={(e) => setIncompleteSummary(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-800 placeholder-stone-400 transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
            />
          </div>

          {/* 3. What blocked you? */}
          <div className="space-y-1.5">
            <label
              htmlFor="blockers-summary"
              className="block font-semibold text-stone-800 dark:text-stone-200"
            >
              3. What blocked you or slowed execution?
            </label>
            <textarea
              id="blockers-summary"
              rows={2}
              placeholder="Dependencies, access hurdles, technical debt, or external bottlenecks..."
              value={blockersSummary}
              onChange={(e) => setBlockersSummary(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-800 placeholder-stone-400 transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
            />
          </div>

          {/* 4. What is your main focus next week? */}
          <div className="space-y-1.5">
            <label
              htmlFor="next-week-focus"
              className="block font-semibold text-stone-800 dark:text-stone-200"
            >
              4. What is your main focus next week?
            </label>
            <textarea
              id="next-week-focus"
              rows={2}
              placeholder="Top priorities, critical commitments, and upcoming sprint outcomes..."
              value={nextWeekFocus}
              onChange={(e) => setNextWeekFocus(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-800 placeholder-stone-400 transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-stone-900 text-white hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-600 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving Check-In...
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Save Check-In
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
