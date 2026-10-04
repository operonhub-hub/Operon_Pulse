"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Kanban,
  Target,
  ArrowRightLeft,
  BarChart3,
  Users,
  Settings,
  Activity,
  Zap,
  LogOut,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { UserProfile } from "@/types";
import { logoutAction } from "@/lib/auth/actions";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export const mainNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Tasks", href: "/my-tasks", icon: CheckSquare },
  { label: "Team Board", href: "/team-board", icon: Kanban },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Weekly Review", href: "/weekly-review", icon: ArrowRightLeft },
  { label: "Insights", href: "/insights", icon: BarChart3 },
];

export const bottomNavItems: NavItem[] = [
  { label: "Team", href: "/team", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  user?: UserProfile;
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ user, className, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const displayName = user?.name || "David Peterson";
  const displayRole = user?.role || "MEMBER";
  const displayInitials = user?.initials || "DP";
  const isAdmin = displayRole === "ADMIN";

  return (
    <aside
      className={cn(
        "flex h-full flex-col justify-between border-r border-zinc-200/80 bg-white select-none",
        className
      )}
    >
      {/* Brand Header */}
      <div className="flex flex-col">
        <div className="flex h-16 items-center gap-3 px-6 border-b border-zinc-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-amber-400 shadow-sm">
            <Activity className="h-4 w-4 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-zinc-900">
                OperonPulse
              </span>
              <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-semibold text-amber-800">
                v1.0
              </span>
            </div>
            <span className="text-[11px] text-zinc-600">
              Operon Workspace
            </span>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="px-3 py-4">
          <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
            Workspace
          </div>
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-zinc-900 text-white shadow-xs"
                      : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive
                          ? "text-amber-400"
                          : "text-zinc-600 group-hover:text-zinc-900"
                      )}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors",
                        isActive
                          ? "bg-zinc-800 text-amber-300"
                          : "bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col border-t border-zinc-100 p-3 space-y-3">
        {/* Core Philosophy Banner */}
        <div className="rounded-lg border border-amber-200/60 bg-amber-50/50 p-3">
          <div className="flex items-center gap-2 text-amber-900 font-medium text-xs">
            <Zap className="h-3.5 w-3.5 text-amber-600" />
            <span>Weekly Cadence</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
            Plan · Execute · Unblock · Review
          </p>
        </div>

        {/* Bottom Nav items */}
        <nav className="space-y-1">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive
                      ? "text-amber-400"
                      : "text-zinc-600 group-hover:text-zinc-900"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Identity & Logout Button */}
        <div className="flex items-center justify-between rounded-lg border border-zinc-200/60 bg-zinc-50/70 p-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Avatar
              fallback={displayInitials}
              size="sm"
              className="bg-zinc-900 text-amber-400 font-semibold shrink-0"
            />
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-900 truncate">
                  {displayName}
                </span>
                {isAdmin && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-amber-100/80 px-1 py-0.2 text-[9px] font-bold uppercase tracking-wider text-amber-900 shrink-0">
                    <Shield className="h-2.5 w-2.5 text-amber-700" />
                    Admin
                  </span>
                )}
              </div>
              <span className="text-[11px] text-zinc-600 truncate">
                {user?.email || "Founder & Lead"}
              </span>
            </div>
          </div>

          <form action={logoutAction} className="shrink-0 ml-1">
            <button
              type="submit"
              aria-label="Sign out"
              title="Sign out"
              className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-800 transition-colors focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
