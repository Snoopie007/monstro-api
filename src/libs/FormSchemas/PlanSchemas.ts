
import { z } from "zod";

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
})

function validateFamily(data: z.infer<typeof NewPlanSchema>, ctx: z.RefinementCtx) {
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
}


const NewSubSchema = z.object({
    interval: z.enum(["day", "week", "month", "year"], { message: "Required" }),
    intervalThreshold: z.number().min(1, { message: "Required" }).max(365, { message: "Max 31" }),
    allowProration: z.boolean().optional(),
    billingAnchor: z.enum(["1st", "1st & 15th"]).optional()
}).merge(NewPlanSchema).superRefine(validateFamily);


const NewPackageSchema = z.object({
    expireInterval: z.enum(["day", "week", "month", "year"]).optional(),
    expireThreshold: z.number().optional(),
    totalClassLimit: z.number().optional(),
    intervalClassLimit: z.number().optional(),
}).merge(NewPlanSchema).superRefine(validateFamily);


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
    NewSubSchema,
    type PresetInterval,
    PresetIntervals,
    PlanType,
    BillingAnchorConfigSchema,
    NewPackageSchema,
    NewPlanSchema
}