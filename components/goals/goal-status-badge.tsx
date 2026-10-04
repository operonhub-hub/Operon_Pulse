import * as React from "react";
import { GoalStatus, goalStatusDisplayMap } from "@/types";

interface GoalStatusBadgeProps {
  status: GoalStatus;
  className?: string;
}

export function GoalStatusBadge({ status, className = "" }: GoalStatusBadgeProps) {
  const getStyle = () => {
    switch (status) {
      case "ACHIEVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900";
      case "ON_TRACK":
        return "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-900";
      case "AT_RISK":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900";
      case "OFF_TRACK":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900";
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${getStyle()} ${className}`}
    >
      {goalStatusDisplayMap[status]}
    </span>
  );
}
