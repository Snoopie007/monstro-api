import { TimeValue } from "react-aria";
import { z } from "zod";

export const NewProgramSchema = z.object({
    description: z.string().min(3, { message: "Description is required" }),
    name: z.string().min(3, { message: "Program name is required" }),
    levels: z.array(
        z.object({
            name: z.string().min(1, { message: "Level name is required" }),
            sessions: z.array(
                z.object({
                    day: z.string().min(1, { message: "Day is required" }),
                    time: z.string().min(1, { message: "Time is required" }),
                    durationTime: z.number().min(1, { message: "Duration time is required" }),
                })
            ),
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
        })
    ),
});
