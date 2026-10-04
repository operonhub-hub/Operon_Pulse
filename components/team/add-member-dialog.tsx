"use client";

import { useState } from "react";
import { UserPlus, Eye, EyeOff, Shield, User, AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserRole } from "@/types";
import { createTeamMemberAction } from "@/lib/team/actions";

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemberAdded?: (member: { id: string; email: string; fullName: string; role: UserRole }) => void;
}

export function AddMemberDialog({
  open,
  onOpenChange,
  onMemberAdded,
}: AddMemberDialogProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [role, setRole] = useState<UserRole>("MEMBER");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!open) return null;

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setTemporaryPassword("");
    setRole("MEMBER");
    setShowPassword(false);
    setError(null);
    setSuccessMessage(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setError("Please provide a full name.");
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please provide a valid work email address.");
      return;
    }

    if (!temporaryPassword || temporaryPassword.length < 8) {
      setError("Temporary password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const res = await createTeamMemberAction({
        fullName: fullName.trim(),
        email: email.trim(),
        temporaryPassword,
        role,
      });

      if (!res.success) {
        setError(res.error || "Failed to add team member.");
        setLoading(false);
        return;
      }

      setSuccessMessage(res.message || "Team member successfully created.");
      
      if (res.user && onMemberAdded) {
        onMemberAdded(res.user);
      }

      // Clear password and form immediately from memory
      setTemporaryPassword("");

      // Auto close after brief confirmation
      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-member-dialog-title"
    >
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 id="add-member-dialog-title" className="text-base font-bold text-foreground">
                Add Team Member
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Create an account for a new workspace contributor
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close dialog"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-md flex items-start gap-2.5 text-xs text-red-800 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div className="flex-1 font-medium leading-relaxed">{error}</div>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-md flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div className="flex-1 font-medium leading-relaxed">{successMessage}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label htmlFor="member-fullname" className="text-xs font-semibold text-foreground">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="member-fullname"
              type="text"
              required
              disabled={loading}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="w-full px-3 py-2 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </div>

          {/* Work Email */}
          <div className="space-y-1.5">
            <label htmlFor="member-email" className="text-xs font-semibold text-foreground">
              Work Email <span className="text-red-500">*</span>
            </label>
            <input
              id="member-email"
              type="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@company.com"
              className="w-full px-3 py-2 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </div>

          {/* Temporary Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="member-password" className="text-xs font-semibold text-foreground">
                Temporary Password <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-muted-foreground">Min. 8 characters</span>
            </div>
            <div className="relative">
              <input
                id="member-password"
                type={showPassword ? "text" : "password"}
                required
                disabled={loading}
                value={temporaryPassword}
                onChange={(e) => setTemporaryPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 pr-9 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide temporary password" : "Show temporary password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              The member can sign in immediately using this email and temporary password.
            </p>
          </div>

          {/* Role Selection */}
          <div className="space-y-1.5 pt-1">
            <label htmlFor="member-role" className="text-xs font-semibold text-foreground">
              Workspace Role <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("MEMBER")}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2 text-xs transition-colors ${
                  role === "MEMBER"
                    ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                <User className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div>
                  <div className="font-semibold text-foreground">MEMBER</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Tasks, Board & Personal Reviews
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole("ADMIN")}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2 text-xs transition-colors ${
                  role === "ADMIN"
                    ? "border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-foreground ring-1 ring-amber-500"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                <Shield className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                <div>
                  <div className="font-semibold text-foreground">ADMIN</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Team, Goals, Insights & All Reviews
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={handleClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="text-xs gap-1.5 bg-primary text-primary-foreground"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating Member...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Add Member</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
