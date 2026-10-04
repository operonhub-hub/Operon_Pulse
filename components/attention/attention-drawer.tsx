"use client";

import * as React from "react";
import { X, CheckCheck, CheckCircle2 } from "lucide-react";
import { AttentionCenterData } from "@/lib/attention/types";
import { AttentionItemCard } from "./attention-item-card";
import { markAllAttentionReadAction } from "@/lib/attention/actions";
import { broadcastAuthEvent } from "@/lib/auth/broadcast";
import { Button } from "@/components/ui/button";

interface AttentionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: AttentionCenterData;
  onRefresh?: () => void;
}

export function AttentionDrawer({
  isOpen,
  onClose,
  data,
  onRefresh,
}: AttentionDrawerProps) {
  const [isPending, startTransition] = React.useTransition();
  const drawerRef = React.useRef<HTMLDivElement>(null);

  // Close on ESC key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllAttentionReadAction();
      broadcastAuthEvent({ type: "ATTENTION_UPDATED" });
      onRefresh?.();
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-6 sm:pl-10">
        <div
          ref={drawerRef}
          className="w-screen max-w-md transform bg-white dark:bg-stone-900 shadow-2xl transition-all duration-300 flex flex-col border-l border-stone-200/80 dark:border-stone-800"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-200/80 dark:border-stone-800 px-5 py-4 bg-stone-50/60 dark:bg-stone-900/80">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Needs Attention
              </h2>
              {data.unreadCount > 0 ? (
                <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-950 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900">
                  {data.unreadCount} unread
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-xs font-medium text-stone-600 dark:text-stone-400">
                  0 unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {data.unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  disabled={isPending}
                  className="h-8 gap-1 text-xs text-stone-600 hover:text-stone-900 dark:text-stone-300"
                >
                  <CheckCheck className="h-3.5 w-3.5 text-amber-600" />
                  <span>Mark all read</span>
                </Button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close attention center"
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Subheader / Summary bar if items exist */}
          {data.items.length > 0 && (
            <div className="flex items-center gap-3 border-b border-stone-100 dark:border-stone-800/80 bg-stone-50/30 dark:bg-stone-950/30 px-5 py-2 text-[11px] text-stone-500">
              <span>{data.items.length} active issue{data.items.length === 1 ? "" : "s"}</span>
              {data.criticalCount > 0 && (
                <span className="text-rose-600 font-semibold">
                  · {data.criticalCount} critical
                </span>
              )}
              {data.warningCount > 0 && (
                <span className="text-amber-600 font-medium">
                  · {data.warningCount} warning
                </span>
              )}
            </div>
          )}

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {data.items.length > 0 ? (
              data.items.map((item) => (
                <AttentionItemCard
                  key={item.key}
                  item={item}
                  onItemClick={onClose}
                  onStateChanged={onRefresh}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/60 mb-3.5">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  You&apos;re all caught up.
                </h3>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 max-w-xs">
                  No execution issues currently need your attention.
                </p>
              </div>
            )}
          </div>

          {/* Footer Reassurance */}
          <div className="border-t border-stone-200/80 dark:border-stone-800 p-4 bg-stone-50/60 dark:bg-stone-950/40">
            <p className="text-[11px] text-stone-500 text-center">
              Attention items update dynamically as commitments progress.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
