import { z } from "zod";


export const MemberSchema = z.object({
    firstName: z.string(),
    lastName: z.string().nullable(),
    email: z.string(),
});

export const LocationSchema = z.object({
    name: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    address: z.string().nullable().optional(),
});

// chema is shared everywhere (for job payload)
export const InvoiceJobSchema = z.object({
    member: MemberSchema,
    location: LocationSchema,
    invoice: z.object({
        id: z.string(),
        total: z.coerce.number(),
        dueDate: z.coerce.date(),
        description: z.string().nullable(),
        items: z.array(z.object({
            name: z.string(),
            description: z.string().nullable(),
            quantity: z.coerce.number(),
            price: z.coerce.number(),
        })),
        status: z.string(),
    })
});

export const ClassSchema = z.object({
    name: z.string(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    instructor: z.object({
        firstName: z.string(),
        lastName: z.string().nullable(),
    }).nullable().optional(),
});

const PricingSchema = z.object({
    name: z.string(),
    currency: z.string(),
    price: z.coerce.number(),
    interval: z.enum(['day', 'week', 'month', 'year']),
})

export const DiscountSchema = z.object({
    amount: z.coerce.number(),
    duration: z.coerce.number(),
})

export const SubscriptionJobSchema = z.object({
    sid: z.string(),
    lid: z.string(),
    member: MemberSchema,
    location: LocationSchema,
    taxRate: z.coerce.number(),
    stripeCustomerId: z.string().nullable(),
    pricing: PricingSchema,
    discount: DiscountSchema.optional(),
})

export const CashSubscriptionJobSchema = z.object({
    sid: z.string(),
    lid: z.string(),
    interval: z.enum(['day', 'week', 'month', 'year']),
    intervalThreshold: z.coerce.number(),
})


export const RRClassSchema = z.object({
    plan: z.object({
        id: z.string(),
        classLimitInterval: z.enum(["week", "term", "one"]).nullable(),
        totalClassLimit: z.coerce.number().nullable(),
    }),
    memberPlanId: z.string(),
    lid: z.string(),
    location: z.object({
        timezone: z.string(),
    }).and(LocationSchema),
    session: z.object({
        programId: z.string(),
        programName: z.string(),
        id: z.string(),
        utcStartTime: z.coerce.date(),
        utcEndTime: z.coerce.date(),
        capacity: z.coerce.number().nullable().optional(),
        staffId: z.string().nullable().optional(),
    }),
    member: MemberSchema,
});

export const ClassReminderJobSchema = z.object({
    lid: z.string(),
    rid: z.string(),
    member: MemberSchema,
    location: LocationSchema,
    class: ClassSchema,
});

export const CheckMissedClassSchema = z.object({
    rid: z.string(),
    lid: z.string(),
    mid: z.string(),
    member: MemberSchema,
    location: LocationSchema,
    class: ClassSchema,
});

export type CheckMissedClassData = z.infer<typeof CheckMissedClassSchema>;
export type ClassReminderData = z.infer<typeof ClassReminderJobSchema>;
export type RRClassData = z.infer<typeof RRClassSchema>;
export type DiscountData = z.infer<typeof DiscountSchema>;
export type SubscriptionJobData = z.infer<typeof SubscriptionJobSchema>;
export type CashSubscriptionJobData = z.infer<typeof CashSubscriptionJobSchema>;
