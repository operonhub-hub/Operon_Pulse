/**
 * OperonPulse Team Department & Business Function Definitions.
 *
 * Defines the standard business functions for workspace team members.
 * Kept strictly independent from permission roles (ADMIN | MEMBER).
 */

export const DEPARTMENTS = [
  "Sales",
  "Marketing",
  "Operations",
  "Product",
  "Engineering",
  "Design",
  "Finance",
  "Customer Success",
  "Human Resources",
  "Leadership",
  "Other",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

/**
 * Validates whether a given value is a recognised department or empty/null.
 */
export function isValidDepartment(val: unknown): val is Department {
  if (typeof val !== "string") return false;
  return (DEPARTMENTS as readonly string[]).includes(val.trim());
}

/**
 * Formats a department for display, with graceful fallback.
 */
export function formatDepartmentDisplay(department?: string | null): string {
  if (!department || !department.trim()) {
    return "Not assigned";
  }
  return department.trim();
}
