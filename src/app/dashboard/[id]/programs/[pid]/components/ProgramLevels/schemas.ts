import z from 'zod';
import { TimeValue } from "react-aria";

export const UpdateLevelsSchema = z.object({
    name: z.string(),
    sessions: z.array(
        z.object({
            day: z.string(),
            time: z.custom<TimeValue>().nullable(),
            durationTime: z.preprocess((val) => Number(val), z.number()),
            duration_time: z.string().optional()
        })
    ),
    capacity: z.preprocess((val) => Number(val), z.number()),
    minAge: z.preprocess((val) => Number(val), z.number()),
    maxAge: z.preprocess((val) => Number(val), z.number()),
});