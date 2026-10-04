/**
 * Lightweight client-side broadcast helper for cross-tab session synchronization.
 *
 * Security invariant:
 * NEVER transmit access tokens, refresh tokens, passwords, or sensitive credentials.
 * Only transmits generic notification events to trigger tab revalidation.
 */

export const AUTH_BROADCAST_CHANNEL = "operonpulse-auth";

export interface AuthBroadcastMessage {
  type: "SESSION_CHANGED" | "SIGNED_OUT" | "SIGNED_IN" | "ATTENTION_UPDATED";
  userId?: string | null;
}

/**
 * Broadcasts a session event to all other open tabs on the same origin.
 */
export function broadcastAuthEvent(message: AuthBroadcastMessage): void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return;
  }

  try {
    const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
    channel.postMessage(message);
    channel.close();
  } catch {
    // Graceful fallback if channel creation is restricted
  }
}
