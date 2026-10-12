/**
 * Week planning context utilities for OperonPulse.
 * Handles canonical ISO Monday normalization, week calculation,
 * active vs planning vs past week classification, and URL persistence.
 */

import {
  getMondayDateString,
  getPreviousWeekMonday,
  getNextWeekMonday,
  getISOWeekNumber,
  formatWeekLabelFromMonday,
} from "./date.ts";

export type WeekContextType = "ACTIVE" | "PLANNING" | "PAST";

export interface WeekContextInfo {
  selectedMonday: string;
  activeMonday: string;
  type: WeekContextType;
  weekNumber: number;
  label: string;
  badgeLabel: string;
  dateRange: string;
  previousMonday: string;
  nextMonday: string;
  isCurrentWeek: boolean;
  isPlanningWeek: boolean;
  isPastWeek: boolean;
}

/**
 * Validates and normalizes any week parameter to its canonical ISO Monday (YYYY-MM-DD).
 * If the input is missing, empty, or not a valid date, falls back to the current active week Monday.
 */
export function normalizeWeekStart(input?: string | null): string {
  const activeMonday = getMondayDateString();
  if (!input || typeof input !== "string") {
    return activeMonday;
  }

  const trimmed = input.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return activeMonday;
  }

  const [year, month, day] = trimmed.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return activeMonday;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return activeMonday;
  }

  // Normalize to Monday of that week
  return getMondayDateString(date);
}

/**
 * Returns current active week Monday in Africa/Lagos
 */
export function getActiveWeekMonday(): string {
  return getMondayDateString();
}

/**
 * Classifies whether a selected Monday is the active week, a planning/future week, or a past week.
 */
export function getWeekContextType(
  selectedMonday: string,
  activeMonday: string = getActiveWeekMonday()
): WeekContextType {
  if (selectedMonday === activeMonday) {
    return "ACTIVE";
  }
  return selectedMonday > activeMonday ? "PLANNING" : "PAST";
}

/**
 * Extracts the user-friendly date range part from a formatted week label.
 * Example: "Week 43 · Oct 19–25, 2026" -> "Oct 19–25, 2026"
 */
export function getWeekDateRange(mondayStr: string): string {
  const label = formatWeekLabelFromMonday(mondayStr);
  const parts = label.split("·");
  return (parts[1] || "").trim();
}

/**
 * Computes full week context details for execution views and week navigators.
 */
export function getWeekContextInfo(
  selectedMondayInput?: string | null,
  activeMondayInput?: string | null
): WeekContextInfo {
  const activeMonday = activeMondayInput || getActiveWeekMonday();
  const selectedMonday = normalizeWeekStart(selectedMondayInput);
  const type = getWeekContextType(selectedMonday, activeMonday);
  const weekNumber = getISOWeekNumber(selectedMonday);
  const label = formatWeekLabelFromMonday(selectedMonday);
  const dateRange = getWeekDateRange(selectedMonday);

  let badgeLabel = "Active Week";
  if (type === "PLANNING") {
    badgeLabel = "Planning Week";
  } else if (type === "PAST") {
    badgeLabel = "Past Week";
  }

  return {
    selectedMonday,
    activeMonday,
    type,
    weekNumber,
    label,
    badgeLabel,
    dateRange,
    previousMonday: getPreviousWeekMonday(selectedMonday),
    nextMonday: getNextWeekMonday(selectedMonday),
    isCurrentWeek: type === "ACTIVE",
    isPlanningWeek: type === "PLANNING",
    isPastWeek: type === "PAST",
  };
}

/**
 * Builds a URL path preserving the week parameter if it differs from the active week.
 * If preserveAlways is true, appends ?week= even if it is the active week.
 */
export function buildWeekUrl(
  basePath: string,
  mondayStr?: string | null,
  options?: { preserveAlways?: boolean }
): string {
  if (!mondayStr) {
    return basePath;
  }

  const normalized = normalizeWeekStart(mondayStr);
  const activeMonday = getActiveWeekMonday();

  if (!options?.preserveAlways && normalized === activeMonday) {
    return basePath;
  }

  const separator = basePath.includes("?") ? "&" : "?";
  return `${basePath}${separator}week=${normalized}`;
}
