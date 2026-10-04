"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AUTH_BROADCAST_CHANNEL, AuthBroadcastMessage } from "@/lib/auth/broadcast";

interface AuthSessionSyncProps {
  currentUserId: string | null;
  currentRole?: string | null;
}

/**
 * Client component mounted in the authenticated app shell to listen for cross-tab session mutations.
 *
 * Guarantees:
 * 1. An old tab immediately detects when another tab logs in as a different user or logs out.
 * 2. Invalidates stale client UI and re-executes Server Components with the active session.
 * 3. Prevents stale Admin UI or permissions from persisting across tabs.
 */
export function AuthSessionSync({ currentUserId, currentRole }: AuthSessionSyncProps) {
  const router = useRouter();
  const activeUserIdRef = useRef<string | null>(currentUserId);
  const activeRoleRef = useRef<string | null>(currentRole || null);
  const isNavigatingRef = useRef<boolean>(false);

  useEffect(() => {
    activeUserIdRef.current = currentUserId;
    activeRoleRef.current = currentRole || null;
  }, [currentUserId, currentRole]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const handleSessionChange = (newUserId: string | null | undefined) => {
      if (isNavigatingRef.current) return;

      const prevUserId = activeUserIdRef.current;

      // 1. User logged out across tabs
      if (!newUserId) {
        if (prevUserId) {
          isNavigatingRef.current = true;
          window.location.assign("/login");
        }
        return;
      }

      // 2. Switched from one authenticated user to a different user
      if (prevUserId && newUserId !== prevUserId) {
        isNavigatingRef.current = true;
        // Hard-safe reload to completely flush stale client memory and role state
        window.location.assign("/dashboard");
        return;
      }

      // 3. User newly signed in from unauthenticated state
      if (!prevUserId && newUserId) {
        isNavigatingRef.current = true;
        window.location.assign("/dashboard");
        return;
      }

      // 4. Same user refreshed or updated
      router.refresh();
    };

    // A. Supabase Auth State Listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        handleSessionChange(null);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        handleSessionChange(session.user.id);
      }
    });

    // B. BroadcastChannel cross-tab listener (instant notification across browser tabs)
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
        channel.onmessage = (event: MessageEvent<AuthBroadcastMessage>) => {
          if (!event.data) return;
          if (event.data.type === "SIGNED_OUT") {
            handleSessionChange(null);
          } else if (event.data.type === "SESSION_CHANGED" || event.data.type === "SIGNED_IN") {
            handleSessionChange(event.data.userId);
          }
        };
      } catch {
        // BroadcastChannel unavailable
      }
    }

    // C. Window storage listener for fallback cross-tab storage detection
    const handleStorage = (event: StorageEvent) => {
      if (event.key && (event.key.includes("supabase.auth.token") || event.key.includes("auth-token"))) {
        if (!event.newValue) {
          handleSessionChange(null);
        } else {
          try {
            const parsed = JSON.parse(event.newValue);
            const newId = parsed?.user?.id || parsed?.currentSession?.user?.id;
            handleSessionChange(newId);
          } catch {
            router.refresh();
          }
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      subscription.unsubscribe();
      if (channel) {
        channel.close();
      }
      window.removeEventListener("storage", handleStorage);
    };
  }, [router]);

  return null;
}
