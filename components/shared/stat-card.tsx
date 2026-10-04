import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: LucideIcon;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  accentColor?: "default" | "amber" | "emerald" | "blue" | "rose";
  className?: string;
}

const accentDotMap = {
  default: "bg-zinc-400",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  rose: "bg-rose-500",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  change,
  changeType = "neutral",
  accentColor = "default",
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-xl border border-zinc-200/80 bg-white transition-all hover:border-zinc-300 hover:shadow-xs",
        className
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn("h-2 w-2 shrink-0 rounded-full", accentDotMap[accentColor])}
              aria-hidden="true"
            />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
              {title}
            </span>
          </div>
          {Icon && (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-50 text-zinc-500 border border-zinc-200/60">
              <Icon className="h-3.5 w-3.5" />
            </div>
          )}
        </div>

        <div className="mt-2.5 flex items-baseline justify-between gap-2">
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
            {value}
          </div>
          {change && (
            <span
              className={cn(
                "text-xs font-semibold shrink-0",
                changeType === "positive" && "text-emerald-700",
                changeType === "negative" && "text-rose-700",
                changeType === "neutral" && "text-zinc-600"
              )}
            >
              {change}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="mt-1 text-xs text-zinc-600 line-clamp-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
