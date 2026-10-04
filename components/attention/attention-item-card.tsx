"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  Check,
  X,
  ArrowRight,
  Clock,
} from "lucide-react";
import { AttentionItem } from "@/lib/attention/types";
import { markAttentionReadAction, dismissAttentionAction } from "@/lib/attention/actions";
import { broadcastAuthEvent } from "@/lib/auth/broadcast";
import { cn } from "@/lib/utils";

interface AttentionItemCardProps {
  item: AttentionItem;
  onItemClick?: () => void;
  onStateChanged?: () => void;
}

export function AttentionItemCard({
  item,
  onItemClick,
  onStateChanged,
}: AttentionItemCardProps) {
  const [isPending, startTransition] = React.useTransition();
  const [localRead, setLocalRead] = React.useState(item.isRead);
  const [localDismissed, setLocalDismissed] = React.useState(item.isDismissed);

  React.useEffect(() => {
    setLocalRead(item.isRead);
    setLocalDismissed(item.isDismissed);
  }, [item.isRead, item.isDismissed]);

  if (item.dismissible && localDismissed) {
    return null;
  }

  const handleMarkRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (localRead) return;

    setLocalRead(true);
    startTransition(async () => {
      await markAttentionReadAction(item.key);
      broadcastAuthEvent({ type: "ATTENTION_UPDATED" });
      onStateChanged?.();
    });
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!item.dismissible) return;

    setLocalDismissed(true);
    startTransition(async () => {
      await dismissAttentionAction(item.key);
      broadcastAuthEvent({ type: "ATTENTION_UPDATED" });
      onStateChanged?.();
    });
  };

  const handleLinkClick = () => {
    if (!localRead) {
      setLocalRead(true);
      startTransition(async () => {
        await markAttentionReadAction(item.key);
        broadcastAuthEvent({ type: "ATTENTION_UPDATED" });
        onStateChanged?.();
      });
    }
    onItemClick?.();
  };

  // Severity styling
  const severityConfig = {
    CRITICAL: {
      icon: AlertOctagon,
      iconColor: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-50/70 dark:bg-rose-950/40",
      borderColor: "border-rose-200/80 dark:border-rose-900/60",
      badgeText: "Critical",
      badgeColor: "bg-rose-100/80 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
    },
    WARNING: {
      icon: AlertTriangle,
      iconColor: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50/50 dark:bg-amber-950/30",
      borderColor: "border-amber-200/80 dark:border-amber-900/60",
      badgeText: "Warning",
      badgeColor: "bg-amber-100/80 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    },
    INFO: {
      icon: item.type === "TASK_DUE_SOON" ? Clock : Info,
      iconColor: "text-sky-600 dark:text-sky-400",
      bgColor: "bg-stone-50/80 dark:bg-stone-900/50",
      borderColor: "border-stone-200/80 dark:border-stone-800",
      badgeText: "Info",
      badgeColor: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
    },
  }[item.severity];

  const Icon = severityConfig.icon;

  return (
    <div
      className={cn(
        "group relative rounded-xl border p-3.5 transition-all",
        severityConfig.bgColor,
        severityConfig.borderColor,
        localRead ? "opacity-75 hover:opacity-100" : "shadow-2xs",
        isPending && "pointer-events-none opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-2.5">
        {/* Left Icon + Content */}
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="mt-0.5 shrink-0">
            <Icon className={cn("h-4 w-4", severityConfig.iconColor)} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  severityConfig.badgeColor
                )}
              >
                {severityConfig.badgeText}
              </span>
              {!localRead && (
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" title="Unread" />
              )}
            </div>

            <h4 className="mt-1 text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 leading-snug">
              {item.title}
            </h4>
            <p className="mt-0.5 text-[11px] sm:text-xs text-stone-600 dark:text-stone-400 leading-normal line-clamp-2">
              {item.description}
            </p>

            {/* Action Link */}
            <div className="mt-2.5 flex items-center gap-2">
              <Link
                href={item.href}
                onClick={handleLinkClick}
                className="inline-flex items-center gap-1 text-xs font-semibold text-stone-900 hover:text-amber-700 dark:text-stone-100 dark:hover:text-amber-400 group-hover:underline focus:outline-none focus:ring-1 focus:ring-amber-500 rounded"
              >
                <span>View action</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Actions: Mark as Read & Dismiss */}
        <div className="flex items-center gap-1 shrink-0">
          {!localRead && (
            <button
              type="button"
              onClick={handleMarkRead}
              title="Mark as read"
              aria-label="Mark as read"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          )}

          {item.dismissible && (
            <button
              type="button"
              onClick={handleDismiss}
              title="Dismiss"
              aria-label="Dismiss notification"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
