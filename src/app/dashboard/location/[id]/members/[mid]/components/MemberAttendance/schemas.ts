import { z } from "zod";

export const MakeupClassSchema = z.object({
  originalReservationId: z.string(),
  startOn: z.date(),
  endOn: z.date(),
  sessionId: z.string().optional(),
  useCustomTime: z.boolean().default(false),
  customDuration: z.number().min(15).max(240).default(30),
});

export type MakeupClassFormData = z.infer<typeof MakeupClassSchema>;

