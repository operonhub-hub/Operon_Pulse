import * as React from "react";
import { Status } from "@/types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: Status;
  className?: string;
  showDot?: boolean;
}

const statusConfig: Record<
  Status,
  { label: string; containerClass: string; dotClass: string }
> = {
  "Not Started": {
    label: "Not Started",
    containerClass: "bg-zinc-100 text-zinc-700 border-zinc-200/80",
    dotClass: "bg-zinc-400",
  },
  "In Progress": {
    label: "In Progress",
    containerClass: "bg-blue-50 text-blue-700 border-blue-200/70",
    dotClass: "bg-blue-500",
  },
  "In Review": {
    label: "In Review",
    containerClass: "bg-purple-50 text-purple-700 border-purple-200/70",
    dotClass: "bg-purple-500",
  },
  Done: {
    label: "Done",
    containerClass: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
    dotClass: "bg-emerald-500",
  },
  Blocked: {
    label: "Blocked",
    containerClass: "bg-rose-50 text-rose-700 border-rose-200/70",
    dotClass: "bg-rose-500",
  },
};

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig["Not Started"];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors select-none",
        config.containerClass,
        className
      )}
    >
      {showDot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dotClass)}
          aria-hidden="true"
        />
      )}
      <span>{config.label}</span>
    </span>
  );
}
