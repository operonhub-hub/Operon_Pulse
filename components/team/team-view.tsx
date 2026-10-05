"use client";

import { useState } from "react";
import { Users, Shield, UserCheck, UserPlus, UserX, RotateCcw } from "lucide-react";
import { PageContainer } from "@/components/shared/page-container";
import { SectionHeader } from "@/components/shared/section-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Profile, UserRole } from "@/types";
import { AddMemberDialog } from "./add-member-dialog";
import { DeactivateMemberDialog } from "./deactivate-member-dialog";
import { ReactivateMemberDialog } from "./reactivate-member-dialog";

interface TeamViewProps {
  initialMembers: Profile[];
  isAdmin: boolean;
  currentUserId?: string;
}

export function TeamView({ initialMembers, isAdmin, currentUserId }: TeamViewProps) {
  const [members, setMembers] = useState<Profile[]>(initialMembers);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deactivatingMember, setDeactivatingMember] = useState<Profile | null>(null);
  const [reactivatingMember, setReactivatingMember] = useState<Profile | null>(null);

  const activeCount = members.filter((m) => m.is_active !== false).length;

  const handleMemberAdded = (newMember: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
  }) => {
    const newProfile: Profile = {
      id: newMember.id,
      full_name: newMember.fullName,
      email: newMember.email,
      role: newMember.role,
      avatar_url: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setMembers((prev) => [newProfile, ...prev]);
  };

  const handleDeactivated = (memberId: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, is_active: false } : m))
    );
  };

  const handleReactivated = (memberId: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, is_active: true } : m))
    );
  };

  return (
    <PageContainer className="space-y-6 pb-16">
      {/* Header with Add Member button for Admins */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionHeader
          title="Team Directory"
          description="Active and inactive team members and workspace role assignments."
          badge={
            <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              {activeCount} Active / {members.length} Total
            </span>
          }
        />

        {isAdmin && (
          <div>
            <Button
              onClick={() => setAddDialogOpen(true)}
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
                  ? "Admin view: Provision new members, deactivate departures, or reactivate past members."
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
                  <th className="px-4 py-3 text-center">Status</th>
                  {isAdmin && <th className="px-5 py-3 text-right">Actions</th>}
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
                  const isActive = member.is_active !== false;
                  const isCurrentUser = currentUserId === member.id;
                  const joinedDate = member.created_at
                    ? new Date(member.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—";

                  return (
                    <tr
                      key={member.id}
                      className={`group transition-colors hover:bg-muted/30 ${
                        !isActive ? "opacity-75 bg-muted/10" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            src={member.avatar_url || undefined}
                            fallback={initials}
                            size="sm"
                            className={`font-medium text-xs ${
                              isActive
                                ? "bg-muted text-foreground"
                                : "bg-muted/50 text-muted-foreground opacity-60"
                            }`}
                          />
                          <div>
                            <div
                              className={`font-semibold ${
                                isActive ? "text-foreground" : "text-muted-foreground line-through"
                              }`}
                            >
                              {member.full_name || "Unnamed User"}
                            </div>
                            {isCurrentUser && (
                              <span className="text-[10px] text-muted-foreground font-normal">
                                (You)
                              </span>
                            )}
                          </div>
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
                      <td className="px-4 py-3.5 text-center">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-900/60 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                            Inactive
                          </span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-3.5 text-right">
                          {isCurrentUser ? (
                            <span className="text-[11px] text-muted-foreground italic">Current account</span>
                          ) : isActive ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeactivatingMember(member)}
                              className="h-7 px-2.5 text-[11px] text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200/70 dark:border-red-900/60 gap-1 shadow-2xs"
                            >
                              <UserX className="h-3 w-3" />
                              <span>Deactivate</span>
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setReactivatingMember(member)}
                              className="h-7 px-2.5 text-[11px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-200/70 dark:border-emerald-900/60 gap-1 shadow-2xs"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Reactivate</span>
                            </Button>
                          )}
                        </td>
                      )}
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
              const isActive = member.is_active !== false;
              const isCurrentUser = currentUserId === member.id;
              const joinedDate = member.created_at
                ? new Date(member.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—";

              return (
                <div
                  key={member.id}
                  className={`p-4 space-y-3 text-xs ${
                    !isActive ? "opacity-75 bg-muted/10" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        src={member.avatar_url || undefined}
                        fallback={initials}
                        size="sm"
                        className={`font-medium text-xs ${
                          isActive
                            ? "bg-muted text-foreground"
                            : "bg-muted/50 text-muted-foreground opacity-60"
                        }`}
                      />
                      <div>
                        <div
                          className={`font-semibold ${
                            isActive ? "text-foreground" : "text-muted-foreground line-through"
                          }`}
                        >
                          {member.full_name || "Unnamed User"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{member.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
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
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px] text-muted-foreground">
                    <span>Joined: {joinedDate}</span>
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-900/60 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                          Inactive
                        </span>
                      )}

                      {isAdmin && !isCurrentUser && (
                        isActive ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeactivatingMember(member)}
                            className="h-6 px-2 text-[10px] text-red-600 dark:text-red-400 border-red-200/70 dark:border-red-900/60 gap-1"
                          >
                            <UserX className="h-2.5 w-2.5" />
                            <span>Deactivate</span>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReactivatingMember(member)}
                            className="h-6 px-2 text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-200/70 dark:border-emerald-900/60 gap-1"
                          >
                            <RotateCcw className="h-2.5 w-2.5" />
                            <span>Reactivate</span>
                          </Button>
                        )
                      )}
                    </div>
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
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onMemberAdded={handleMemberAdded}
        />
      )}

      {/* Admin Deactivate Member Dialog */}
      {isAdmin && (
        <DeactivateMemberDialog
          member={deactivatingMember}
          open={Boolean(deactivatingMember)}
          onOpenChange={(open) => !open && setDeactivatingMember(null)}
          onDeactivated={handleDeactivated}
        />
      )}

      {/* Admin Reactivate Member Dialog */}
      {isAdmin && (
        <ReactivateMemberDialog
          member={reactivatingMember}
          open={Boolean(reactivatingMember)}
          onOpenChange={(open) => !open && setReactivatingMember(null)}
          onReactivated={handleReactivated}
        />
      )}
    </PageContainer>
  );
}
