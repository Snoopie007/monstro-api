import z from 'zod';
import { TimeValue } from "react-aria";



export const LevelSchema = z.object({
    name: z.string(),
    sessions: z.array(
        z.object({
            day: z.string(),
            time: z.custom<TimeValue>().nullable(),
            duration: z.preprocess((val) => Number(val), z.number()),
        })
    ),
    capacity: z.preprocess((val) => Number(val), z.number()),
    minAge: z.preprocess((val) => Number(val), z.number()),
    maxAge: z.preprocess((val) => Number(val), z.number()),
});
