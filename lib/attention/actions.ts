"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserSession } from "@/lib/auth/session";
import { getCurrentUserAttentionCenterData } from "./queries";

/**
 * Validates attention key format.
 */
function isValidKey(key: unknown): key is string {
  return typeof key === "string" && key.trim().length > 0 && key.length <= 255;
}

/**
 * Marks an individual active attention item as read for the authenticated user.
 * Strictly verifies server-side that the attention key belongs to a currently active derived item.
 */
export async function markAttentionReadAction(
  attentionKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isValidKey(attentionKey)) {
      return { success: false, error: "Invalid attention key format" };
    }

    const session = await getCurrentUserSession();
    if (!session.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify key belongs to a currently active derived attention item for this user
    const attentionData = await getCurrentUserAttentionCenterData();
    const activeItem = attentionData.items.find((i) => i.key === attentionKey);

    if (!activeItem) {
      return { success: false, error: "Attention item is no longer active." };
    }

    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: "Database unavailable" };
    }

    const now = new Date().toISOString();

    const { error } = await supabase.from("attention_states").upsert(
      {
        user_id: session.user.id,
        attention_key: attentionKey,
        read_at: now,
      },
      { onConflict: "user_id,attention_key" }
    );

    if (error) {
      return {
        success: false,
        error: "Unable to update attention state. Please try again.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/my-tasks");
    revalidatePath("/team-board");
    revalidatePath("/goals");
    revalidatePath("/weekly-review");
    revalidatePath("/insights");

    return { success: true };
  } catch {
    return {
      success: false,
      error: "Unable to update attention state. Please try again.",
    };
  }
}

/**
 * Marks all currently active attention items as read for the authenticated user.
 * Derives active attention keys strictly server-side without trusting client arrays.
 */
export async function markAllAttentionReadAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getCurrentUserSession();
    if (!session.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Derive active attention keys server-side
    const attentionData = await getCurrentUserAttentionCenterData();
    const unreadKeys = attentionData.items
      .filter((i) => !i.isRead)
      .map((i) => i.key);

    if (unreadKeys.length === 0) {
      return { success: true };
    }

    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: "Database unavailable" };
    }

    const userId = session.user.id;
    const now = new Date().toISOString();
    const rows = unreadKeys.map((key) => ({
      user_id: userId,
      attention_key: key,
      read_at: now,
    }));

    const { error } = await supabase
      .from("attention_states")
      .upsert(rows, { onConflict: "user_id,attention_key" });

    if (error) {
      return {
        success: false,
        error: "Unable to update attention state. Please try again.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/my-tasks");
    revalidatePath("/team-board");
    revalidatePath("/goals");
    revalidatePath("/weekly-review");
    revalidatePath("/insights");

    return { success: true };
  } catch {
    return {
      success: false,
      error: "Unable to update attention state. Please try again.",
    };
  }
}

/**
 * Dismisses an informational attention item for the authenticated user.
 * Strictly verifies server-side that the item exists AND is marked dismissible.
 */
export async function dismissAttentionAction(
  attentionKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isValidKey(attentionKey)) {
      return { success: false, error: "Invalid attention key format" };
    }

    const session = await getCurrentUserSession();
    if (!session.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Derive active attention items server-side
    const attentionData = await getCurrentUserAttentionCenterData();
    const activeItem = attentionData.items.find((i) => i.key === attentionKey);

    if (!activeItem) {
      return { success: false, error: "Attention item is no longer active." };
    }

    // Server-side dismissibility validation
    if (!activeItem.dismissible) {
      return {
        success: false,
        error: "This attention item cannot be dismissed while it remains active.",
      };
    }

    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: "Database unavailable" };
    }

    const now = new Date().toISOString();

    const { error } = await supabase.from("attention_states").upsert(
      {
        user_id: session.user.id,
        attention_key: attentionKey,
        dismissed_at: now,
        read_at: now,
      },
      { onConflict: "user_id,attention_key" }
    );

    if (error) {
      return {
        success: false,
        error: "Unable to update attention state. Please try again.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/my-tasks");
    revalidatePath("/team-board");
    revalidatePath("/goals");
    revalidatePath("/weekly-review");
    revalidatePath("/insights");

    return { success: true };
  } catch {
    return {
      success: false,
      error: "Unable to update attention state. Please try again.",
    };
  }
}
