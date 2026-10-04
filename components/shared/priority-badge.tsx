import * as React from "react";
import { Priority } from "@/types";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
} from "lucide-react";

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
  showIcon?: boolean;
}

const priorityConfig: Record<
  Priority,
  {
    label: string;
    containerClass: string;
    icon: React.ComponentType<{ className?: string }>;
    iconClass: string;
  }
> = {
  Critical: {
    label: "Critical",
    containerClass: "bg-red-50 text-red-700 border-red-200/80",
    icon: AlertTriangle,
    iconClass: "text-red-600",
  },
  High: {
    label: "High",
    containerClass: "bg-amber-50 text-amber-700 border-amber-200/80",
    icon: ArrowUp,
    iconClass: "text-amber-600",
  },
  Medium: {
    label: "Medium",
    containerClass: "bg-sky-50 text-sky-700 border-sky-200/80",
    icon: ArrowRight,
    iconClass: "text-sky-600",
  },
  Low: {
    label: "Low",
    containerClass: "bg-zinc-100 text-zinc-600 border-zinc-200/80",
    icon: ArrowDown,
    iconClass: "text-zinc-500",
  },
};

export function PriorityBadge({
  priority,
  className,
  showIcon = true,
}: PriorityBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig["Medium"];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors select-none",
        config.containerClass,
        className
      )}
    >
      {showIcon && <Icon className={cn("h-3 w-3 shrink-0", config.iconClass)} />}
      <span>{config.label}</span>
    </span>
  );
}
