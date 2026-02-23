import type { HolidayWithPattern } from "@subtrees/constants/data";



function parsePattern(pattern: string): { month: number; day: number; dow: 'day' | number } {
    const [n, dowStr, monthStr] = pattern.split(':');
    if (!n || !dowStr || !monthStr) {
        throw new Error('Invalid pattern');
    }
    const month = parseInt(monthStr, 10);
    const day = n === 'L' ? -1 : parseInt(n, 10);
    const dow = dowStr === 'day' ? 'day' : parseInt(dowStr, 10);
    return { month, day, dow };
}


export function dateMatchesPattern(date: Date, pattern: string): boolean {
    const { month, day, dow } = parsePattern(pattern);
    if (date.getMonth() !== month) return false;

    if (dow === 'day') {
        return date.getDate() === day;
    }

    const year = date.getFullYear();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const occurrences: Date[] = [];
    const d = new Date(monthStart);
    while (d <= monthEnd) {
        if (d.getDay() === dow) occurrences.push(new Date(d));
        d.setDate(d.getDate() + 1);
    }

    const isLast = day === -1;
    const nthDate = isLast ? occurrences[occurrences.length - 1] : occurrences[day - 1];
    return nthDate ? date.getDate() === nthDate.getDate() : false;
}


/**
 * Resolve which holidays are blocked (by ids from settings),
 * then check if the given date falls on any of them.
 * Returns the matched holiday object if found, otherwise null.
 */
export function findBlockedHoliday(
    date: Date,
    blockedHolidayIds: number[],
    allHolidays: HolidayWithPattern[]
): HolidayWithPattern | null {
    if (!blockedHolidayIds?.length) return null;
    const blocked = allHolidays.filter((h) => blockedHolidayIds.includes(h.id));
    for (const h of blocked) {
        if (dateMatchesPattern(date, h.pattern)) {
            return h;
        }
    }
    return null;
}