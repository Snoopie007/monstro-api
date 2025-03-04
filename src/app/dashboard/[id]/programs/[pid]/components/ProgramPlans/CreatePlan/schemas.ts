import z from 'zod';

const NewPlanSchema = z.object({
    type: z.enum(["recurring", "one-time"], { message: "Required" }),
    name: z.string().min(2, { message: "Required" }),
    description: z.string().min(2, { message: "Required" }),
    contractId: z.number().optional(),
    amount: z.number().gt(1, { message: "Price must be at least $1." }),
    interval: z.enum(["day", "week", "month", "year"], { message: "Required" }),
    intervalCount: z.number().min(1, { message: "Required" }),
    family: z.boolean().optional(),
    familyMemberLimit: z.number().multipleOf(1).lt(10, { message: "Enter a number between 1 and 10." }).optional(),
    pkg: z.object({
        expireDate: z.date().optional(),
        totalClassLimit: z.number(),
        intervalClassLimit: z.number().optional(),
    }),
    subscription: z.object({
        allowProration: z.boolean().optional(),
        billingAnchor: z.enum(["1st", "1st & 15th"], { message: "Required" })
    }),
}).superRefine((data, ctx) => {
    if (data.type === 'one-time' && data.pkg.totalClassLimit === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Required"
        });
    }
    if (data.family && data.familyMemberLimit === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Required"
        });
    }
});

const PresetIntervals: { label: string, interval: string, intervalCount: number }[] = [
    { label: "Daily", interval: "day", intervalCount: 1 },
    { label: "Weekly", interval: "week", intervalCount: 1 },
    { label: "Monthly", interval: "month", intervalCount: 1 },
    { label: "Yearly", interval: "year", intervalCount: 1 },
    { label: "Every 3 Months", interval: "month", intervalCount: 3 },
    { label: "Every 6 Months", interval: "month", intervalCount: 6 },
    { label: "Custom", interval: "custom", intervalCount: 1 }
];

const PlanType: { label: string, description: string, value: string }[] = [
    { label: "Package Plan", description: "All new messages", value: "one-time" },
    { label: "Subscription Plan", description: "All new messages and mentions", value: "recurring" }
];

const BillingAnchorConfigSchema = [
    { label: "1st of the month only", value: "1st" },
    { label: "1st or 15th of the month", value: "1st & 15th" },
]
export { PresetIntervals, PlanType, NewPlanSchema, BillingAnchorConfigSchema };