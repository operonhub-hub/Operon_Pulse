"use client";

import { useState } from "react";
import { Users, Shield, UserCheck, UserPlus } from "lucide-react";
import { PageContainer } from "@/components/shared/page-container";
import { SectionHeader } from "@/components/shared/section-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Profile, UserRole } from "@/types";
import { AddMemberDialog } from "./add-member-dialog";

interface TeamViewProps {
  initialMembers: Profile[];
  isAdmin: boolean;
}

export function TeamView({ initialMembers, isAdmin }: TeamViewProps) {
  const [members, setMembers] = useState<Profile[]>(initialMembers);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleMemberAdded = (newMember: { id: string; email: string; fullName: string; role: UserRole }) => {
    const newProfile: Profile = {
      id: newMember.id,
      full_name: newMember.fullName,
      email: newMember.email,
      role: newMember.role,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setMembers((prev) => [newProfile, ...prev]);
  };

  return (
    <PageContainer className="space-y-6 pb-16">
      {/* Header with Add Member button for Admins */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionHeader
          title="Team Directory"
          description="Active team members and workspace role assignments."
          badge={
            <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              {members.length} Members
            </span>
          }
        />

        {isAdmin && (
          <div>
            <Button
              onClick={() => setDialogOpen(true)}
              size="sm"
              className="gap-1.5 bg-primary text-primary-foreground text-xs shadow-xs"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Add Member</span>
            </Button>
          </div>
        )}
      </div>

      {/* Team Roster Card */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-foreground">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Workspace Members</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {isAdmin
                  ? "Admin view: You can manage and provision new workspace team members."
                  : "Member directory for the OperonPulse workspace."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-y border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-5 py-3">Member</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((member) => {
                  const initials =
                    member.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "U";

                  const isMemberAdmin = member.role === "ADMIN";
                  const joinedDate = member.created_at
                    ? new Date(member.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—";

                  return (
                    <tr key={member.id} className="group transition-colors hover:bg-muted/30">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            src={member.avatar_url || undefined}
                            fallback={initials}
                            size="sm"
                            className="bg-muted font-medium text-foreground text-xs"
                          />
                          <span className="font-semibold text-foreground">
                            {member.full_name || "Unnamed User"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">{member.email}</td>
                      <td className="px-4 py-3.5">
                        {isMemberAdmin ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-200/70 dark:border-amber-900/60 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                            <Shield className="h-3 w-3 text-amber-600" />
                            ADMIN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-muted border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            <UserCheck className="h-3 w-3 text-muted-foreground" />
                            MEMBER
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">{joinedDate}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 divide-y divide-border md:hidden">
            {members.map((member) => {
              const initials =
                member.full_name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "U";
              const isMemberAdmin = member.role === "ADMIN";
              const joinedDate = member.created_at
                ? new Date(member.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—";

              return (
                <div key={member.id} className="p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        src={member.avatar_url || undefined}
                        fallback={initials}
                        size="sm"
                        className="bg-muted font-medium text-foreground text-xs"
                      />
                      <div>
                        <div className="font-semibold text-foreground">
                          {member.full_name || "Unnamed User"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{member.email}</div>
                      </div>
                    </div>

                    {isMemberAdmin ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-200/70 dark:border-amber-900/60 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                        <Shield className="h-2.5 w-2.5 text-amber-600" />
                        ADMIN
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        <UserCheck className="h-2.5 w-2.5 text-muted-foreground" />
                        MEMBER
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                    <span>Joined: {joinedDate}</span>
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Admin Add Member Dialog */}
      {isAdmin && (
        <AddMemberDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onMemberAdded={handleMemberAdded}
        />
      )}
    </PageContainer>
  );
}
