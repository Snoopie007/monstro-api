
import { z } from "zod";

const SessionSchema = z.object({
    id: z.coerce.number().optional(),
    day: z.coerce.number().min(1, { message: " required" }).max(7, { message: "required" }),
    time: z.string().min(1, { message: "required" }),
    duration: z.coerce.number().min(1, { message: "required" }),
});

const LevelSchema = z.object({
    name: z.string().min(1, { message: "required" }),
    sessions: z.array(SessionSchema),
    capacity: z.coerce.number().min(1, { message: "Capacity > 0" }),
    minAge: z.coerce.number().min(2, { message: "Min > 2" }),
    maxAge: z.coerce.number().min(3, { message: "Max > 3" }),
    interval: z.enum(["week", "month", "year"]),
    intervalThreshold: z.coerce.number().min(1, { message: "Interval count > 0" }),
}).superRefine((data, ctx) => {
    if (data.maxAge <= data.minAge) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Max > min",
            path: ["maxAge"],
        });
    }
});


const NewProgramSchema = z.object({
    description: z.string().min(3, { message: "Description is required" }),
    name: z.string().min(3, { message: "Program name is required" }),
    levels: z.array(LevelSchema),
});

const UpdateProgramSchema = z.object({
    description: z.string(),
    name: z.string().min(8),
});



const InviteMemberSchema = z.object({
    programId: z.number(),
    email: z.string().email(),
});
const DaysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type PresetSessionInterval = { label: string, interval: string, intervalThreshold: number }

const PresetSessionIntervals: PresetSessionInterval[] = [

    { label: "Weekly", interval: "week", intervalThreshold: 1 },
    { label: "Monthly", interval: "month", intervalThreshold: 1 },
    { label: "Yearly", interval: "year", intervalThreshold: 1 },
    { label: "Custom", interval: "custom", intervalThreshold: 1 },
];



const NewPlanSchema = z.object({
    type: z.enum(["recurring", "one-time"], { message: "Required" }),
    name: z.string().min(2, { message: "Required" }),
    description: z.string().min(2, { message: "Required" }),
    amount: z.number().gt(1, { message: "Price must be at least $1." }),
    classLimitInterval: z.enum(["week", "month", "year"]).optional(),
    classLimitThreshold: z.number().optional(),
    family: z.boolean().optional(),
    familyMemberLimit: z.number().optional(),
    contractId: z.number().optional(),
    pkg: z.object({
        expireDate: z.date().optional(),
        totalClassLimit: z.number().optional(),
        intervalClassLimit: z.number().optional(),
    }),
    subscription: z.object({
        interval: z.enum(["day", "week", "month", "year"], { message: "Required" }),
        intervalThreshold: z.number().min(1, { message: "Required" }).max(365, { message: "Max 31" }),
        allowProration: z.boolean().optional(),
        billingAnchor: z.enum(["1st", "1st & 15th"]).optional()
    }),
}).superRefine((data, ctx) => {

    if (data.type === 'one-time') {

        if (!data.pkg.totalClassLimit || data.pkg.totalClassLimit < 1) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Required",
                path: ["pkg", "totalClassLimit"]
            });
        }
        if (data.classLimitThreshold && !data.classLimitInterval) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Required",
                path: ["classLimitInterval"]
            });
        }
    }
    if (data.family) {
        if (!data.familyMemberLimit) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Required",
                path: ["familyMemberLimit"]
            });
        } else if (data.familyMemberLimit < 1) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "At least 1 family member.",
                path: ["familyMemberLimit"]
            });
        } else if (data.familyMemberLimit > 10) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Max 10 family members",
                path: ["familyMemberLimit"]
            });
        }
    }
});


type PresetInterval = { label: string, interval: string, intervalThreshold: number }

const PresetIntervals: PresetInterval[] = [
    { label: "Daily", interval: "day", intervalThreshold: 1 },
    { label: "Weekly", interval: "week", intervalThreshold: 1 },
    { label: "Monthly", interval: "month", intervalThreshold: 1 },
    { label: "Yearly", interval: "year", intervalThreshold: 1 },
    { label: "Every 3 Months", interval: "month", intervalThreshold: 3 },
    { label: "Every 6 Months", interval: "month", intervalThreshold: 6 },
    { label: "Custom", interval: "custom", intervalThreshold: 1 }
];

const PlanType: { label: string, description: string, value: string }[] = [
    { label: "Package Plan", description: "All new messages", value: "one-time" },
    { label: "Subscription Plan", description: "All new messages and mentions", value: "recurring" }
];

const BillingAnchorConfigSchema = [
    { label: "1st of the month only", value: "1st" },
    { label: "1st or 15th of the month", value: "1st & 15th" },
]

export {
    SessionSchema,
    LevelSchema,
    NewProgramSchema,
    UpdateProgramSchema,
    InviteMemberSchema,
    DaysOfWeek,
    PresetSessionIntervals,
    type PresetSessionInterval,
    type PresetInterval,
    PresetIntervals,
    PlanType,
    BillingAnchorConfigSchema,
    NewPlanSchema
}