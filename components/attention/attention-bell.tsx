"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AttentionCenterData } from "@/lib/attention/types";
import { AttentionDrawer } from "./attention-drawer";
import { AUTH_BROADCAST_CHANNEL, AuthBroadcastMessage } from "@/lib/auth/broadcast";
import { cn } from "@/lib/utils";

interface AttentionBellProps {
  initialData?: AttentionCenterData;
  className?: string;
}

export function AttentionBell({
  initialData = {
    items: [],
    unreadCount: 0,
    totalActiveCount: 0,
    criticalCount: 0,
    warningCount: 0,
    infoCount: 0,
  },
  className,
}: AttentionBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [data, setData] = React.useState<AttentionCenterData>(initialData);

  // Synchronize when server initialData updates
  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Subscribe to cross-tab broadcast events
  React.useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
      return;
    }

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
      channel.onmessage = (event: MessageEvent<AuthBroadcastMessage>) => {
        if (event.data?.type === "ATTENTION_UPDATED" || event.data?.type === "SESSION_CHANGED") {
          router.refresh();
        }
      };
    } catch {
      // BroadcastChannel unavailable
    }

    return () => {
      channel?.close();
    };
  }, [router]);

  const unreadCount = data.unreadCount;
  const hasCritical = data.criticalCount > 0;
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setIsOpen(true)}
        className={cn(
          "relative text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100",
          className
        )}
        aria-label={`Open attention center, ${unreadCount} unread item${unreadCount === 1 ? "" : "s"}`}
      >
        <Bell className="h-4 w-4" />

        {unreadCount > 0 && (
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-xs animate-in fade-in zoom-in duration-200",
              hasCritical ? "bg-rose-600" : "bg-amber-600"
            )}
          >
            {badgeLabel}
          </span>
        )}
      </Button>

      <AttentionDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        data={data}
        onRefresh={() => router.refresh()}
      />
    </>
  );
}
