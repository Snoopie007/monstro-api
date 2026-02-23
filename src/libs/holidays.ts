import type { HolidayWithPattern } from "@subtrees/constants/data";

/**
 * Parse a holiday pattern string
 * Format: "N:DOW:month"
 *   Fixed: "N:day:month" (e.g., "1:day:0")
 *   Relative: "N:DOW:month" (e.g., "3:1:0" or "L:1:4")
 *   month is zero-based (0=January, 11=December)
 */
type ParsedPattern = {
  month: number;
  day: number;
  dow: 'day' | number;
};

function parsePattern(pattern: string): ParsedPattern {
  const [nStr, dowStr, monthStr] = pattern.split(':');

  if (!nStr || !dowStr || !monthStr) {
    throw new Error(`Invalid holiday pattern: ${pattern}`);
  }

  const month = Number.parseInt(monthStr, 10);
  if (!Number.isInteger(month) || month < 0 || month > 11) {
    throw new Error(`Invalid holiday month in pattern: ${pattern}`);
  }

  const day = nStr.toUpperCase() === 'L' ? -1 : Number.parseInt(nStr, 10);
  if (!Number.isInteger(day) || day === 0 || day < -1 || day > 31) {
    throw new Error(`Invalid holiday day in pattern: ${pattern}`);
  }

  const dow = dowStr === 'day' ? 'day' : Number.parseInt(dowStr, 10);
  if (dow !== 'day' && (!Number.isInteger(dow) || dow < 0 || dow > 6)) {
    throw new Error(`Invalid holiday day-of-week in pattern: ${pattern}`);
  }

  return {
    month,
    day,
    dow,
  };
}

/**
 * Calculate the actual date for a holiday in a given year.
 * Handles both fixed-date holidays (e.g., Christmas on Dec 25)
 * and relative holidays (e.g., Thanksgiving on 4th Thursday of November).
 */
export function getHolidayDate(holiday: HolidayWithPattern, year: number): Date {
  const parsed = parsePattern(holiday.pattern);

  if (parsed.dow === 'day') {
    return new Date(year, parsed.month, parsed.day);
  }

  if (parsed.day === -1) {
    return getLastWeekdayOfMonth(year, parsed.month, parsed.dow);
  }

  return getNthWeekdayOfMonth(year, parsed.month, parsed.dow, parsed.day);
}

/**
 * Find the nth occurrence of a weekday in a month
 * @param year - The year
 * @param month - The month (0-11)
 * @param dayOfWeek - The day of week (0=Sunday, 6=Saturday)
 * @param n - Which occurrence (1=first, 2=second, etc.)
 */
function getNthWeekdayOfMonth(
  year: number,
  month: number,
  dayOfWeek: number,
  n: number
): Date {
  const firstOfMonth = new Date(year, month, 1);
  const firstDayOfWeek = firstOfMonth.getDay();

  const daysUntilTarget = (dayOfWeek - firstDayOfWeek + 7) % 7;

  const day = 1 + daysUntilTarget + (n - 1) * 7;

  return new Date(year, month, day);
}

/**
 * Find the last occurrence of a weekday in a month
 * @param year - The year
 * @param month - The month (0-11)
 * @param dayOfWeek - The day of week (0=Sunday, 6=Saturday)
 */
function getLastWeekdayOfMonth(
  year: number,
  month: number,
  dayOfWeek: number
): Date {
  const lastDay = new Date(year, month + 1, 0);
  const lastDayOfWeek = lastDay.getDay();

  const daysBack = (lastDayOfWeek - dayOfWeek + 7) % 7;

  return new Date(year, month, lastDay.getDate() - daysBack);
}

/**
 * Get all holiday dates for a given year
 */
export function getAllHolidayDates(
  holidays: HolidayWithPattern[],
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
  holidays: HolidayWithPattern[],
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
