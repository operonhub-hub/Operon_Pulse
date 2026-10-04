"use client";

import * as React from "react";
import { CheckCircle2, Clock, Users, ChevronDown, ChevronUp } from "lucide-react";
import { TeamMemberCheckinStatus } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface TeamCheckinStatusProps {
  teamCheckins: TeamMemberCheckinStatus[];
}

export function TeamCheckinStatus({ teamCheckins }: TeamCheckinStatusProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const totalMembers = teamCheckins.length;
  const submittedCount = teamCheckins.filter((m) => m.hasSubmitted).length;

  return (
    <Card className="border-stone-200/80 dark:border-stone-800 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-400">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Team Check-In Status</CardTitle>
              <CardDescription className="text-xs text-stone-500 dark:text-stone-400">
                End-of-week submission overview across team roster
              </CardDescription>
            </div>
          </div>
          <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
            {submittedCount} / {totalMembers} submitted
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {teamCheckins.map(({ profile, hasSubmitted, checkin }) => {
            const isExpanded = expandedId === profile.id;

            return (
              <div key={profile.id} className="py-3 first:pt-0 last:pb-0">
                <div
                  className="flex items-center justify-between cursor-pointer group"
                  onClick={() => hasSubmitted && setExpandedId(isExpanded ? null : profile.id)}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                      {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 group-hover:text-amber-600 transition-colors">
                        {profile.full_name || profile.email}
                      </p>
                      <p className="text-[11px] text-stone-400">{profile.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasSubmitted ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900">
                        <CheckCircle2 className="h-3 w-3" /> Submitted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                        <Clock className="h-3 w-3" /> Pending
                      </span>
                    )}

                    {hasSubmitted && (
                      <button
                        type="button"
                        className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                        title={isExpanded ? "Collapse Check-In" : "Expand Check-In"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Check-in Content */}
                {isExpanded && checkin && (
                  <div className="mt-3 space-y-2 rounded-xl bg-stone-50/70 p-3 text-xs dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800">
                    {checkin.completed_summary && (
                      <div>
                        <span className="font-semibold text-stone-700 dark:text-stone-300">Completed:</span>
                        <p className="mt-0.5 text-stone-600 dark:text-stone-400 whitespace-pre-wrap">
                          {checkin.completed_summary}
                        </p>
                      </div>
                    )}
                    {checkin.incomplete_summary && (
                      <div>
                        <span className="font-semibold text-stone-700 dark:text-stone-300">Incomplete:</span>
                        <p className="mt-0.5 text-stone-600 dark:text-stone-400 whitespace-pre-wrap">
                          {checkin.incomplete_summary}
                        </p>
                      </div>
                    )}
                    {checkin.blockers_summary && (
                      <div>
                        <span className="font-semibold text-rose-700 dark:text-rose-400">Blockers:</span>
                        <p className="mt-0.5 text-rose-600 dark:text-rose-400 whitespace-pre-wrap">
                          {checkin.blockers_summary}
                        </p>
                      </div>
                    )}
                    {checkin.next_week_focus && (
                      <div>
                        <span className="font-semibold text-stone-700 dark:text-stone-300">Next Focus:</span>
                        <p className="mt-0.5 text-stone-600 dark:text-stone-400 whitespace-pre-wrap">
                          {checkin.next_week_focus}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
