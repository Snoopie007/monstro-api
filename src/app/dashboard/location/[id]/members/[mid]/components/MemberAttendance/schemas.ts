import { z } from "zod";

export const MakeupClassSchema = z.object({
  originalReservationId: z.string(),
  startOn: z.date(),
  endOn: z.date(),
  sessionId: z.string().optional(),
  useCustomTime: z.boolean(),
  customDuration: z.number().min(15).max(240),
});

export type MakeupClassFormData = z.infer<typeof MakeupClassSchema>;

