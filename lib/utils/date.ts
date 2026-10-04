/**
 * Date and Week utilities for OperonPulse weekly execution workflows.
 * All calendar and weekly boundary calculations are pinned to the documented
 * application business timezone: Africa/Lagos (UTC+1).
 */

export const APP_TIME_ZONE = "Africa/Lagos";

function parseDateInput(dateInput: Date | string = new Date()): Date {
  if (typeof dateInput === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return new Date(`${dateInput}T00:00:00Z`);
    }
    return new Date(dateInput);
  }
  return dateInput;
}

/**
 * Returns the day of the week (0=Sunday, 1=Monday, ..., 6=Saturday) in Africa/Lagos
 */
export function getAppDayOfWeek(dateInput: Date | string = new Date()): number {
  const date = parseDateInput(dateInput);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    weekday: "short",
  });
  const weekday = formatter.format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

/**
 * Returns the ISO calendar date string (YYYY-MM-DD) for a given date in Africa/Lagos
 */
export function getTodayDateString(dateInput: Date | string = new Date()): string {
  const date = parseDateInput(dateInput);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Returns ISO week number for a given date in Africa/Lagos (default: today)
 */
export function getISOWeekNumber(dateInput: Date | string = new Date()): number {
  const todayStr = getTodayDateString(dateInput);
  const [year, month, day] = todayStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Returns the Monday date (YYYY-MM-DD) for a given date in Africa/Lagos
 */
export function getMondayDateString(dateInput: Date | string = new Date()): string {
  const todayStr = getTodayDateString(dateInput);
  const [year, month, day] = todayStr.split("-").map(Number);
  const currentDay = getAppDayOfWeek(dateInput);
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

  const monday = new Date(Date.UTC(year, month - 1, day + diffToMonday));
  const y = monday.getUTCFullYear();
  const m = String(monday.getUTCMonth() + 1).padStart(2, "0");
  const d = String(monday.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns the previous Monday date string (YYYY-MM-DD)
 */
export function getPreviousWeekMonday(mondayStr: string): string {
  const [year, month, day] = mondayStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day - 7));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns the next Monday date string (YYYY-MM-DD)
 */
export function getNextWeekMonday(mondayStr: string): string {
  const [year, month, day] = mondayStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 7));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const getNextMondayDateString = getNextWeekMonday;

/**
 * Returns the date string (YYYY-MM-DD) N days ahead in Africa/Lagos
 */
export function getDaysAheadDateString(days: number, dateInput: Date | string = new Date()): string {
  const todayStr = getTodayDateString(dateInput);
  const [year, month, day] = todayStr.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1, day + days));
  const y = target.getUTCFullYear();
  const m = String(target.getUTCMonth() + 1).padStart(2, "0");
  const d = String(target.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns true if the date is Thursday (4), Friday (5), Saturday (6), or Sunday (0) in Africa/Lagos
 */
export function isThursdayOrLater(dateInput: Date | string = new Date()): boolean {
  const day = getAppDayOfWeek(dateInput);
  return day === 4 || day === 5 || day === 6 || day === 0;
}

/**
 * Formats a Monday date string into a user-friendly label:
 * "Week 41 · Oct 5–11, 2026"
 */
export function formatWeekLabelFromMonday(mondayStr: string): string {
  const [year, month, day] = mondayStr.split("-").map(Number);
  const monday = new Date(Date.UTC(year, month - 1, day));
  const weekNum = getISOWeekNumber(mondayStr);

  const sunday = new Date(Date.UTC(year, month - 1, day + 6));

  const monthFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
  });
  const startMonth = monthFormatter.format(monday);
  const endMonth = monthFormatter.format(sunday);

  const startDay = monday.getUTCDate();
  const endDay = sunday.getUTCDate();
  const fullYear = sunday.getUTCFullYear();

  let dateRange = "";
  if (startMonth === endMonth) {
    dateRange = `${startMonth} ${startDay}–${endDay}, ${fullYear}`;
  } else {
    dateRange = `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${fullYear}`;
  }

  return `Week ${weekNum} · ${dateRange}`;
}

/**
 * Returns the formatted weekly label for current week in Africa/Lagos
 */
export function getCurrentWeekLabel(dateInput: Date | string = new Date()): string {
  const mondayStr = getMondayDateString(dateInput);
  return formatWeekLabelFromMonday(mondayStr);
}

/**
 * Returns a greeting based on Africa/Lagos local time
 */
export function getTimeBasedGreeting(dateInput: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    hour: "numeric",
    hour12: false,
  });
  const hour = parseInt(formatter.format(dateInput), 10);
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
