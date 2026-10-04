import * as React from "react";
import { ArrowRightLeft, AlertTriangle } from "lucide-react";

interface RolloverBadgeProps {
  rolloverCount?: number;
  rolloverNote?: string | null;
  className?: string;
}

export function RolloverBadge({
  rolloverCount = 0,
  rolloverNote,
  className = "",
}: RolloverBadgeProps) {
  if (!rolloverCount || rolloverCount <= 0) {
    return null;
  }

  const isRepeated = rolloverCount >= 2;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
        isRepeated
          ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
          : "border-stone-200 bg-stone-50 text-stone-700 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-300"
      } ${className}`}
      title={
        rolloverNote
          ? `Carried ${rolloverCount}x: "${rolloverNote}"`
          : `Carried forward ${rolloverCount} time${rolloverCount > 1 ? "s" : ""}`
      }
    >
      {isRepeated ? (
        <AlertTriangle className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
      ) : (
        <ArrowRightLeft className="h-2.5 w-2.5 text-stone-500 dark:text-stone-400 shrink-0" />
      )}
      <span>Carried {rolloverCount}x</span>
      {isRepeated && (
        <span className="hidden sm:inline font-normal text-[9px] text-amber-700 dark:text-amber-400">
          (Repeated)
        </span>
      )}
    </span>
  );
}
