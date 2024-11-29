
import { TimeValue } from "react-aria";
import { z } from "zod";

export const NewProgramSchema = z.object({
    description: z.string(),
    programName: z.string(),
    levels: z.array(
        z.object({
            name: z.string(),
            sessions: z.array(
                z.object({
                    day: z.string(),
                    time: z.custom<TimeValue>().nullable(),
                    durationTime: z.preprocess((val) => Number(val), z.number()),
                })
            ),
            capacity: z.preprocess((val) => Number(val), z.number()),
            minAge: z.preprocess((val) => Number(val), z.number()),
            maxAge: z.preprocess((val) => Number(val), z.number()),

        })
    ),
});
