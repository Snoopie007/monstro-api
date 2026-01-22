
import { z } from "zod";

const SessionSchema = z.object({
    id: z.string().optional(),
    day: z.number().min(1, { message: " required" }).max(7, { message: "required" }),
    time: z.string().min(1, { message: "required" }),
    duration: z.number().min(1, { message: "required" }),
    staffId: z.string().optional(),
});



const ProgramSchema = z.object({
    description: z.string().min(3, { message: "Description is required" }),
    name: z.string().min(3, { message: "Program name is required" }),
    capacity: z.number().min(1, { message: "Capacity > 0" }),
    minAge: z.number().min(2, { message: "Min > 2" }),
    maxAge: z.number().min(3, { message: "Max > 3" }),
    instructorId: z.string().optional(),
    color: z.number().min(1).max(12),
    allowWaitlist: z.boolean(),
    waitlistCapacity: z.number().min(0, { message: "Waitlist capacity > 0" }).optional(),
    allowMakeUpClass: z.boolean(),
    cancelationThreshold: z.number().min(0, { message: "Cancelation threshold > 0" }).optional(),
})

const UpdateProgramSchema = ProgramSchema.superRefine((data, ctx) => {
    if (data.maxAge <= data.minAge) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Max > min",
            path: ["maxAge"],
        });
    }
});




const NewProgramSchema = z.object({
    sessions: z.array(SessionSchema),
}).and(ProgramSchema).superRefine((data, ctx) => {
    if (data.maxAge <= data.minAge) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Max > min",
            path: ["maxAge"],
        });
    }
});



const InviteMemberSchema = z.object({
    programId: z.number(),
    email: z.string().email(),
});

const DaysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export {
    SessionSchema,
    NewProgramSchema,
    UpdateProgramSchema,
    InviteMemberSchema,
    DaysOfWeek
}