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
    <Card className={cn("overflow-hidden transition-all hover:border-zinc-300/80", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn("h-2 w-2 rounded-full", accentDotMap[accentColor])}
              aria-hidden="true"
            />
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              {title}
            </span>
          </div>
          {Icon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-500 border border-zinc-100">
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
            {value}
          </div>
          {change && (
            <span
              className={cn(
                "text-xs font-medium",
                changeType === "positive" && "text-emerald-600",
                changeType === "negative" && "text-rose-600",
                changeType === "neutral" && "text-zinc-500"
              )}
            >
              {change}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="mt-1 text-xs text-zinc-500 line-clamp-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
