import { z } from "zod";

export const ClosureSchema = z.object({
  type: z.enum(['holiday', 'maintenance']),
  occurrenceDate: z.date(),
  endDate: z.date().optional(),
  sessionId: z.string().optional(),
  reason: z.string().optional(),
  notifyMembers: z.boolean().optional(),
});

export type ClosureFormData = z.infer<typeof ClosureSchema>;

export const HolidayDefaultsSchema = z.object({
  blockedHolidays: z.array(z.number()),
  defaultBehavior: z.enum(['block_all', 'block_new_only', 'notify_only']),
  advanceBlockDays: z.number().min(0).max(30),
  autoNotifyMembers: z.boolean(),
});

export type HolidayDefaultsFormData = z.infer<typeof HolidayDefaultsSchema>;

// Holiday type definitions
// Pattern format: "N:DOW:MMM"
//   Fixed dates: "N:day:MMM" (e.g., "1:day:jan" for January 1st)
//   Relative dates: "N:DOW:MMM" (e.g., "3:mon:jan" for 3rd Monday of January, "L:mon:may" for last Monday of May)
//   N = day number (1-31) for fixed, or occurrence (1-4 or L) for relative
//   DOW = day of week (sun, mon, tue, wed, thu, fri, sat) or "day" for fixed dates
//   MMM = month (jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec)
export type Holiday = {
  id: number;
  name: string;
  pattern: string;
};

// Common US holidays
export const COMMON_HOLIDAYS: Holiday[] = [
  { id: 1, name: "New Year's Day", pattern: '1:day:jan' },
  { id: 2, name: 'MLK Day', pattern: '3:mon:jan' },
  { id: 3, name: "Presidents' Day", pattern: '3:mon:feb' },
  { id: 4, name: 'Memorial Day', pattern: 'L:mon:may' },
  { id: 5, name: 'Independence Day', pattern: '4:day:jul' },
  { id: 6, name: 'Labor Day', pattern: '1:mon:sep' },
  { id: 7, name: 'Columbus Day', pattern: '2:mon:oct' },
  { id: 8, name: "Veterans Day", pattern: '11:day:nov' },
  { id: 9, name: 'Thanksgiving', pattern: '4:thu:nov' },
  { id: 10, name: 'Christmas Eve', pattern: '24:day:dec' },
  { id: 11, name: 'Christmas Day', pattern: '25:day:dec' },
  { id: 12, name: "New Year's Eve", pattern: '31:day:dec' },
];

export type HolidayId = number;

