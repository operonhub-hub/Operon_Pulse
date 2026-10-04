import * as React from "react";
import { PageContainer } from "@/components/shared/page-container";
import { SectionHeader } from "@/components/shared/section-header";
import { ProfileForm } from "@/components/settings/profile-form";
import { getCurrentUserSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getCurrentUserSession();

  return (
    <PageContainer className="space-y-6 pb-16">
      <SectionHeader
        title="Settings & Profile"
        description="Manage your account profile, credentials, and workspace preferences."
      />
      <ProfileForm user={session.displayUser} profile={session.profile} />
    </PageContainer>
  );
}
