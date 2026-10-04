"use client";

import * as React from "react";
import { useActionState } from "react";
import { Activity, Lock, Mail, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loginAction, type AuthActionResult } from "@/lib/auth/actions";

export default function LoginPage() {
  const [showPassword, setShowPassword] = React.useState(false);
  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    loginAction,
    null
  );

  return (
    <div className="space-y-6">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-amber-400 shadow-md">
          <Activity className="h-6 w-6 stroke-[2.5]" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            OperonPulse
          </h1>
          <p className="text-xs text-zinc-500 font-medium">
            Your team&apos;s weekly execution, in one place.
          </p>
        </div>
      </div>

      {/* Login Card */}
      <Card className="border-zinc-200/80 shadow-sm bg-white">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg font-semibold text-zinc-900">
            Sign In
          </CardTitle>
          <CardDescription className="text-xs text-zinc-500">
            Enter your credentials to access your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            {/* Error Message Alert */}
            {state?.error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50/80 p-3 text-xs text-red-800"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <div className="leading-relaxed font-medium">{state.error}</div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-zinc-700"
              >
                Work Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@company.com"
                  disabled={isPending}
                  className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:cursor-not-allowed disabled:bg-zinc-50 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-zinc-700"
              >
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••••••"
                  disabled={isPending}
                  className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:cursor-not-allowed disabled:bg-zinc-50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-zinc-900 text-white hover:bg-zinc-800 active:bg-zinc-950 font-medium py-2 h-10 shadow-xs"
            >
              {isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                  <span>Signing In...</span>
                </div>
              ) : (
                <span>Sign In</span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Onboarding info note */}
      <div className="rounded-lg border border-zinc-200/60 bg-zinc-50/70 p-3.5 text-center text-xs text-zinc-500 leading-relaxed">
        <p>
          <strong className="font-semibold text-zinc-700">Internal Startup Platform:</strong>{" "}
          Team members are provisioned by an administrator. Contact your founder or team lead if you need access.
        </p>
      </div>
    </div>
  );
}
