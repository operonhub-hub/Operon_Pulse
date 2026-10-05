"use client";

import * as React from "react";
import { useState, useActionState, useRef, useEffect } from "react";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, KeyRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { changePasswordAction, type ChangePasswordResult } from "@/lib/auth/actions";

export function ChangePasswordCard() {
  const [state, formAction, isPending] = useActionState<ChangePasswordResult | null, FormData>(
    changePasswordAction,
    null
  );

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  // Clear password inputs when password update succeeds
  useEffect(() => {
    if (state?.success && formRef.current) {
      formRef.current.reset();
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [state?.success]);

  return (
    <Card className="border-border bg-card shadow-xs">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-foreground">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Security
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Update your account password.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4 max-w-md">
          {/* Success Feedback */}
          {state?.success && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-200"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium">{state.message || "Password changed successfully."}</span>
            </div>
          )}

          {/* Error Feedback */}
          {state?.error && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50/80 dark:border-red-900/60 dark:bg-red-950/40 p-3 text-xs text-red-800 dark:text-red-300 animate-in fade-in duration-200"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <span className="font-medium">{state.error}</span>
            </div>
          )}

          {/* Current Password Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="currentPassword"
              className="block text-xs font-semibold text-foreground"
            >
              Current Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="currentPassword"
                name="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                disabled={isPending}
                placeholder="Enter current password"
                className="w-full min-h-[44px] rounded-lg border border-input bg-background py-2 pl-9 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                disabled={isPending}
                aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                className="absolute inset-y-0 right-0 flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* New Password Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="newPassword"
              className="block text-xs font-semibold text-foreground"
            >
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="newPassword"
                name="newPassword"
                type={showNewPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                disabled={isPending}
                placeholder="Minimum 8 characters"
                className="w-full min-h-[44px] rounded-lg border border-input bg-background py-2 pl-9 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={isPending}
                aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                className="absolute inset-y-0 right-0 flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Must be at least 8 characters and differ from your current password.
            </p>
          </div>

          {/* Confirm New Password Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-semibold text-foreground"
            >
              Confirm New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                disabled={isPending}
                placeholder="Re-enter new password"
                className="w-full min-h-[44px] rounded-lg border border-input bg-background py-2 pl-9 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isPending}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                className="absolute inset-y-0 right-0 flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto min-h-[40px] px-5 text-xs font-medium bg-primary text-primary-foreground shadow-xs transition-colors"
            >
              {isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                  <span>Updating Password...</span>
                </div>
              ) : (
                <span>Change Password</span>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
