import {
    dateKeyMatchesRecurrence,
    type HolidayWithPattern,
} from "@subtrees/constants/data";


export function dateMatchesPattern(date: Date, pattern: string): boolean {
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return dateKeyMatchesRecurrence(dateKey, pattern);
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
