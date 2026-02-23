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
