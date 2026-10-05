"use client";

import { useState, useEffect, useCallback } from "react";
import { UserX, AlertTriangle, CheckCircle2, Loader2, X, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Profile } from "@/types";
import { deactivateTeamMemberAction } from "@/lib/team/actions";

interface DeactivateMemberDialogProps {
  member: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeactivated?: (memberId: string) => void;
}

export function DeactivateMemberDialog({
  member,
  open,
  onOpenChange,
  onDeactivated,
}: DeactivateMemberDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    if (loading) return;
    setError(null);
    setSuccessMessage(null);
    onOpenChange(false);
  }, [loading, onOpenChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open && !loading) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, handleClose]);

  if (!open || !member) return null;

  const handleDeactivate = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const result = await deactivateTeamMemberAction(member.id);

      if (!result.success) {
        setError(result.error || "Failed to deactivate team member.");
        return;
      }

      setSuccessMessage(result.message || `${member.full_name || member.email} has been deactivated.`);
      if (onDeactivated) {
        onDeactivated(member.id);
      }

      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const memberName = member.full_name || member.email;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deactivate-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400">
              <UserX className="h-5 w-5" />
            </div>
            <div>
              <h2 id="deactivate-dialog-title" className="text-base font-bold text-foreground">
                Deactivate Member
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Revoke workspace access for {memberName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close dialog"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Warning Callout */}
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3.5 space-y-2 text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Workspace Access Changes</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-[11px] leading-relaxed">
            <li>
              <strong>{memberName}</strong> will be logged out and unable to sign back in.
            </li>
            <li>They will be hidden from new task assignment dropdowns and review rosters.</li>
            <li>
              All historical tasks, weekly reviews, check-ins, and goal links remain intact.
            </li>
          </ul>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-md flex items-start gap-2.5 text-xs text-red-800 dark:text-red-300">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div className="flex-1 font-medium leading-relaxed">{error}</div>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-md flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={loading}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleDeactivate}
            disabled={loading || Boolean(successMessage)}
            className="gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs shadow-xs"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{loading ? "Deactivating..." : "Deactivate Member"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
