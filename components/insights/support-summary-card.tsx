"use client";

import { HeartHandshake } from "lucide-react";
import type { MemberSupportSummary } from "@/lib/insights/types";

/**
 * Support metrics for one member, styled in violet to keep them visually
 * separate from owner metrics.
 */
export function SupportSummaryCard({
  summary,
  memberLabel = "You",
}: {
  summary: MemberSupportSummary;
  /** "You" for the member's own view; the member's name in the admin filter. */
  memberLabel?: string;
}) {
  const items = [
    { label: "Supported tasks", value: summary.supported },
    { label: "Supported completed", value: summary.supportedCompleted },
    {
      label: "Support completion rate",
      value: summary.supportCompletionRate !== null ? `${summary.supportCompletionRate}%` : "—",
    },
  ];

  return (
    <div className="p-5 rounded-lg border border-violet-200 bg-violet-50/40 space-y-4 dark:border-violet-900/60 dark:bg-violet-950/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-violet-600" aria-hidden="true" /> Support Work
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Teammates&apos; tasks where {memberLabel === "You" ? "you were" : `${memberLabel} was`} the support person.
            Owner metrics above are unchanged.
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-md border border-violet-200/70 bg-card p-3 dark:border-violet-900/60">
            <dt className="text-[11px] text-muted-foreground">{item.label}</dt>
            <dd className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{item.value}</dd>
          </div>
        ))}
        <div className="rounded-md border border-violet-300 bg-violet-100/60 p-3 dark:border-violet-800 dark:bg-violet-900/30">
          <dt className="text-[11px] text-violet-800 dark:text-violet-200">Contributions</dt>
          <dd className="mt-1 text-lg font-bold text-violet-900 dark:text-violet-100">{summary.contributions}</dd>
          <p className="text-[10px] text-violet-700/80 dark:text-violet-300/80">
            {summary.ownedCompleted} owned + {summary.supportedCompleted} supported completed
          </p>
        </div>
      </dl>
    </div>
  );
}
