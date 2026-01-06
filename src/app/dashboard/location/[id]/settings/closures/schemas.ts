import { z } from "zod";

export const ClosureSchema = z.object({
  type: z.enum(['holiday', 'maintenance']),
  occurrenceDate: z.date(),
  endDate: z.date().optional(),
  sessionId: z.string().optional(),
  reason: z.string().optional(),
});

export type ClosureFormData = z.infer<typeof ClosureSchema>;

export const HolidayDefaultsSchema = z.object({
  blockedHolidays: z.array(z.string()),
  defaultBehavior: z.enum(['block_all', 'block_new_only', 'notify_only']),
  advanceBlockDays: z.number().min(0).max(30),
  autoNotifyMembers: z.boolean(),
});

export type HolidayDefaultsFormData = z.infer<typeof HolidayDefaultsSchema>;

// Common US holidays
export const COMMON_HOLIDAYS = [
  { id: 'new_years', name: "New Year's Day", date: '01-01' },
  { id: 'mlk_day', name: 'MLK Day', date: '01-15' }, // 3rd Monday of January
  { id: 'presidents_day', name: "Presidents' Day", date: '02-15' }, // 3rd Monday of February
  { id: 'memorial_day', name: 'Memorial Day', date: '05-25' }, // Last Monday of May
  { id: 'independence_day', name: 'Independence Day', date: '07-04' },
  { id: 'labor_day', name: 'Labor Day', date: '09-01' }, // 1st Monday of September
  { id: 'columbus_day', name: 'Columbus Day', date: '10-10' }, // 2nd Monday of October
  { id: 'veterans_day', name: "Veterans Day", date: '11-11' },
  { id: 'thanksgiving', name: 'Thanksgiving', date: '11-25' }, // 4th Thursday of November
  { id: 'christmas_eve', name: 'Christmas Eve', date: '12-24' },
  { id: 'christmas', name: 'Christmas Day', date: '12-25' },
  { id: 'new_years_eve', name: "New Year's Eve", date: '12-31' },
] as const;

export type HolidayId = typeof COMMON_HOLIDAYS[number]['id'];

