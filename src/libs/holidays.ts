import type { Holiday } from "@/app/dashboard/location/[id]/settings/closures/schemas";

// Month abbreviation to number mapping
const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

// Day of week abbreviation to number mapping (0 = Sunday)
const DAYS_OF_WEEK: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

/**
 * Parse a holiday pattern string
 * Format: "N:DOW:MMM"
 *   Fixed: "N:day:MMM" (e.g., "1:day:jan")
 *   Relative: "N:DOW:MMM" (e.g., "3:mon:jan" or "L:mon:may")
 */
type ParsedPattern = {
  isFixed: boolean;
  month: number;
  day?: number;           // For fixed dates
  occurrence?: number | 'last';  // For relative dates
  dayOfWeek?: number;     // For relative dates
};

function parsePattern(pattern: string): ParsedPattern {
  const [n, dow, month] = pattern.toLowerCase().split(':');
  const monthNum = MONTHS[month];

  if (dow === 'day') {
    // Fixed date pattern
    return {
      isFixed: true,
      month: monthNum,
      day: parseInt(n, 10),
    };
  }

  // Relative date pattern
  return {
    isFixed: false,
    month: monthNum,
    occurrence: n === 'l' ? 'last' : parseInt(n, 10),
    dayOfWeek: DAYS_OF_WEEK[dow],
  };
}

/**
 * Calculate the actual date for a holiday in a given year.
 * Handles both fixed-date holidays (e.g., Christmas on Dec 25)
 * and relative holidays (e.g., Thanksgiving on 4th Thursday of November).
 */
export function getHolidayDate(holiday: Holiday, year: number): Date {
  const parsed = parsePattern(holiday.pattern);

  if (parsed.isFixed) {
    return new Date(year, parsed.month - 1, parsed.day!);
  }

  if (parsed.occurrence === 'last') {
    return getLastWeekdayOfMonth(year, parsed.month, parsed.dayOfWeek!);
  }

  return getNthWeekdayOfMonth(year, parsed.month, parsed.dayOfWeek!, parsed.occurrence as number);
}

/**
 * Find the nth occurrence of a weekday in a month
 * @param year - The year
 * @param month - The month (1-12)
 * @param dayOfWeek - The day of week (0=Sunday, 6=Saturday)
 * @param n - Which occurrence (1=first, 2=second, etc.)
 */
function getNthWeekdayOfMonth(
  year: number,
  month: number,
  dayOfWeek: number,
  n: number
): Date {
  // Start at the first day of the month
  const firstOfMonth = new Date(year, month - 1, 1);
  const firstDayOfWeek = firstOfMonth.getDay();

  // Calculate days until the first occurrence of the target weekday
  const daysUntilTarget = (dayOfWeek - firstDayOfWeek + 7) % 7;

  // Calculate the day of the month for the nth occurrence
  const day = 1 + daysUntilTarget + (n - 1) * 7;

  return new Date(year, month - 1, day);
}

/**
 * Find the last occurrence of a weekday in a month
 * @param year - The year
 * @param month - The month (1-12)
 * @param dayOfWeek - The day of week (0=Sunday, 6=Saturday)
 */
function getLastWeekdayOfMonth(
  year: number,
  month: number,
  dayOfWeek: number
): Date {
  // Get the last day of the month (day 0 of next month)
  const lastDay = new Date(year, month, 0);
  const lastDayOfWeek = lastDay.getDay();

  // Calculate how many days to go back to reach the target weekday
  const daysBack = (lastDayOfWeek - dayOfWeek + 7) % 7;

  return new Date(year, month - 1, lastDay.getDate() - daysBack);
}

/**
 * Get all holiday dates for a given year
 */
export function getAllHolidayDates(
  holidays: Holiday[],
  year: number
): Map<number, Date> {
  const dateMap = new Map<number, Date>();

  for (const holiday of holidays) {
    dateMap.set(holiday.id, getHolidayDate(holiday, year));
  }

  return dateMap;
}

/**
 * Check if a given date is a holiday
 */
export function isHoliday(
  date: Date,
  holidays: Holiday[],
  blockedHolidayIds: number[]
): boolean {
  const year = date.getFullYear();
  const dateStr = formatDateForComparison(date);

  for (const holiday of holidays) {
    if (!blockedHolidayIds.includes(holiday.id)) continue;

    const holidayDate = getHolidayDate(holiday, year);
    if (formatDateForComparison(holidayDate) === dateStr) {
      return true;
    }
  }

  return false;
}

/**
 * Format a date for comparison (YYYY-MM-DD)
 */
function formatDateForComparison(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
