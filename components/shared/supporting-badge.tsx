import { HeartHandshake } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Marks a task the viewer supports (but doesn't own). Uses violet, the
 * secondary colour for support work throughout the app.
 */
export function SupportingBadge({
  className,
  compact = false,
}: {
  className?: string;
  /** Icon-only variant for tight spaces such as kanban cards. */
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300",
        className
      )}
      title="You are the support person on this task"
      aria-label={compact ? "Supporting" : undefined}
    >
      <HeartHandshake className="h-3 w-3" aria-hidden="true" />
      {!compact && "Supporting"}
    </span>
  );
}

/** Initials for an avatar fallback. */
export function initialsFor(name: string | null | undefined, email?: string | null): string {
  const source = (name || email || "?").trim();
  return (
    source
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}
