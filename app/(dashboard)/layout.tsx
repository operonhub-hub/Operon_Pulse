import * as React from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { getCurrentUserSession } from "@/lib/auth/session";
import { AuthSessionSync } from "@/components/auth/auth-session-sync";
import { getCurrentUserAttentionCenterData } from "@/lib/attention/queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentUserSession();

  // Enforce active session boundary: redirect unauthenticated or deactivated users to /login
  if (!session.isAuthenticated || !session.user || session.profile?.is_active === false) {
    redirect("/login");
  }

  const attentionData = await getCurrentUserAttentionCenterData();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col md:flex-row">
      {/* Real-time cross-tab session synchronizer */}
      <AuthSessionSync
        currentUserId={session.user?.id || null}
        currentRole={session.profile?.role || null}
      />

      {/* Desktop Fixed Sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col z-30">
        <Sidebar user={session.displayUser} className="w-full" />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col md:pl-64 min-w-0">
        <Header user={session.displayUser} attentionData={attentionData} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
