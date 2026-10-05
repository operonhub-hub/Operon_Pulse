"use client";

import * as React from "react";
import { useActionState } from "react";
import { User, Mail, Shield, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateProfileAction, type AuthActionResult } from "@/lib/auth/actions";
import { Profile, UserProfile } from "@/types";
import { ChangePasswordCard } from "./change-password-card";

interface ProfileFormProps {
  user: UserProfile;
  profile: Profile | null;
}

export function ProfileForm({ user, profile }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    updateProfileAction,
    null
  );

  const displayRole = profile?.role || user.role || "MEMBER";
  const isAdmin = displayRole === "ADMIN";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Profile Details Card */}
      <Card className="border-zinc-200/80 bg-white shadow-xs">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-zinc-900">
            Account Profile
          </CardTitle>
          <CardDescription className="text-xs text-zinc-500">
            Manage your personal profile details and workspace identity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-5">
            {/* Feedback messages */}
            {state?.success && (
              <div
                role="status"
                className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-800"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="font-medium">Profile updated successfully.</span>
              </div>
            )}

            {state?.error && (
              <div
                role="alert"
                className="flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50/80 p-3 text-xs text-red-800"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span className="font-medium">{state.error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Full Name (Editable) */}
              <div className="space-y-1.5 sm:col-span-2">
                <label
                  htmlFor="fullName"
                  className="block text-xs font-semibold text-zinc-700"
                >
                  Full Name
                </label>
                <div className="relative max-w-md">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    defaultValue={profile?.full_name || user.name || ""}
                    disabled={isPending}
                    className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:bg-zinc-50 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-zinc-500">
                  This name will appear on assigned tasks, team pulses, and activity logs.
                </p>
              </div>

              {/* Email Address (Read-only) */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-zinc-700"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    readOnly
                    disabled
                    value={profile?.email || user.email || ""}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50/80 py-2 pl-9 pr-3 text-sm text-zinc-600 cursor-not-allowed"
                  />
                </div>
                <p className="text-[11px] text-zinc-500">
                  Email is managed by your workspace administrator.
                </p>
              </div>

              {/* User Role (Read-only) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700">
                  Access Role
                </label>
                <div className="flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 text-sm">
                  <Shield className="h-4 w-4 text-zinc-400" />
                  <span className="font-semibold text-zinc-900 text-xs">
                    {displayRole}
                  </span>
                  {isAdmin ? (
                    <span className="ml-auto rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                      Full Workspace Access
                    </span>
                  ) : (
                    <span className="ml-auto rounded bg-zinc-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700">
                      Standard Member
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500">
                  Role assignments require database-level admin permissions.
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end pt-2 border-t border-zinc-100">
              <Button
                type="submit"
                disabled={isPending}
                className="bg-zinc-900 text-white hover:bg-zinc-800 active:bg-zinc-950 font-medium px-5"
              >
                {isPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                    <span>Saving...</span>
                  </div>
                ) : (
                  <span>Save Changes</span>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Security & Password Card */}
      <ChangePasswordCard />

      {/* Workspace Information Card */}
      <Card className="border-zinc-200/80 bg-white shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-zinc-900">
            Workspace Affiliation
          </CardTitle>
          <CardDescription className="text-xs text-zinc-500">
            Details regarding your assigned workspace and execution cadence.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-zinc-100 text-xs gap-1">
            <span className="font-medium text-zinc-500">Workspace</span>
            <span className="font-semibold text-zinc-900">OperonPulse HQ</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-zinc-100 text-xs gap-1">
            <span className="font-medium text-zinc-500">Execution Cadence</span>
            <span className="font-semibold text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md">
              Weekly Sprint (Mon–Sun)
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 text-xs gap-1">
            <span className="font-medium text-zinc-500">Member Since</span>
            <span className="font-medium text-zinc-700">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "October 2026"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
