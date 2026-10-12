"use client";

import { useState, useEffect } from "react";
import { UserCheck, Shield, AlertCircle, CheckCircle2, Loader2, X, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Profile } from "@/types";
import { updateTeamMemberProfileAction } from "@/lib/team/actions";
import { DEPARTMENTS } from "@/lib/team/departments";

interface EditMemberDialogProps {
  member: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemberUpdated?: (member: { id: string; fullName: string; department?: string | null }) => void;
}

export function EditMemberDialog({
  member,
  open,
  onOpenChange,
  onMemberUpdated,
}: EditMemberDialogProps) {
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      setFullName(member.full_name || "");
      setDepartment(member.department || "");
      setError(null);
      setSuccessMessage(null);
    }
  }, [member, open]);

  if (!open || !member) return null;

  const handleClose = () => {
    if (loading) return;
    setError(null);
    setSuccessMessage(null);
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError("Please provide a valid full name (at least 2 characters).");
      return;
    }

    if (trimmedName.length > 100) {
      setError("Full name cannot exceed 100 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await updateTeamMemberProfileAction({
        memberId: member.id,
        fullName: trimmedName,
        department: department.trim() || null,
      });

      if (!res.success) {
        setError(res.error || "Failed to update member profile.");
        setLoading(false);
        return;
      }

      setSuccessMessage(res.message || "Member profile updated successfully.");

      if (onMemberUpdated) {
        onMemberUpdated({
          id: member.id,
          fullName: trimmedName,
          department: department.trim() || null,
        });
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-member-dialog-title"
    >
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 id="edit-member-dialog-title" className="text-base font-bold text-foreground">
                Edit Team Member
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Update name and business department assignment
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
          {/* Read-only Member Identity */}
          <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Work Email</span>
              <span className="font-mono text-foreground select-all">{member.email}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-muted-foreground font-medium">Workspace Role</span>
              {member.role === "ADMIN" ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                  <Shield className="h-3 w-3" /> ADMIN
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <UserCheck className="h-3 w-3" /> MEMBER
                </span>
              )}
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label htmlFor="edit-member-fullname" className="text-xs font-semibold text-foreground">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-member-fullname"
              type="text"
              required
              disabled={loading}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="w-full px-3 py-2 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </div>

          {/* Department / Function */}
          <div className="space-y-1.5">
            <label htmlFor="edit-member-department" className="text-xs font-semibold text-foreground">
              Department / Function
            </label>
            <select
              id="edit-member-department"
              disabled={loading}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              <option value="">Not assigned</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              Assign or change business function (e.g. Marketing, Operations).
            </p>
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
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
