import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  action,
  badge,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight text-zinc-900 md:text-lg">
            {title}
          </h2>
          {badge}
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-zinc-500">{description}</p>
        )}
      </div>
      {action && <div className="flex items-center gap-2 pt-1 sm:pt-0">{action}</div>}
    </div>
  );
}
