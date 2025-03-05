import { TimeValue } from "react-aria";
import { z } from "zod";
import { Time } from '@internationalized/date';

export function stringToTime(time: string) {
    return new Time(parseInt(time.split(":")[0]), parseInt(time.split(":")[1]));
}

export const SessionSchema = z.object({
    day: z.string().min(1, { message: " required" }),
    time: z.string().min(1, { message: "required" }),
    duration: z.number().min(1, { message: "required" }),
});

export const LevelSchema = z.object({
    name: z.string().min(1, { message: "Level name is required" }),
    sessions: z.array(SessionSchema),
    capacity: z.coerce.number().min(1, { message: "Capacity > 0" }),
    minAge: z.coerce.number().min(2, { message: "Min > 2" }),
    maxAge: z.coerce.number().min(3, { message: "Max > 3" }),
}).superRefine((data, ctx) => {
    if (data.maxAge <= data.minAge) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Max > min",
            path: ["maxAge"],
        });
    }
});


export const NewProgramSchema = z.object({
    description: z.string().min(3, { message: "Description is required" }),
    name: z.string().min(3, { message: "Program name is required" }),
    levels: z.array(LevelSchema),
});
