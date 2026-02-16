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
    intervalThreshold: z.coerce.number(),
})

export const DiscountSchema = z.object({
    amount: z.coerce.number(),
    duration: z.coerce.number(),
})

const SubscriptionJobSchemaBase = z.object({
    sid: z.string(),
    lid: z.string(),
    member: MemberSchema,
    location: LocationSchema,
    taxRate: z.coerce.number(),
    pricing: PricingSchema,
    discount: DiscountSchema.optional(),
});

export const SubscriptionJobSchema = SubscriptionJobSchemaBase.extend({
    stripeCustomerId: z.string().nullable(),
});

export const RecursiveSubscriptionJobSchema = SubscriptionJobSchemaBase.extend({
    stripeCustomerId: z.string().nullable(),
    recurrenceCount: z.number(),
});

export const CashSubscriptionJobSchema = SubscriptionJobSchemaBase.extend({
    vendorId: z.string(),
});

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


// retry payment jobs
export const RetrySubPaymentSchema = z.object({
    paymentIntentId: z.string(),
    attempts: z.number(),
    subId: z.string(),
    lid: z.string(),
})

export const RetryWalletSchema = z.object({
    paymentIntentId: z.string(),
    stripeCustomerId: z.string(),
    paymentMethodId: z.string(),
    attempts: z.number(),
    amount: z.number(),
    walletId: z.string(),
    lid: z.string(),
})
export type RetrySubPaymentData = z.infer<typeof RetrySubPaymentSchema>;
export type RetryWalletData = z.infer<typeof RetryWalletSchema>;
export type CheckMissedClassData = z.infer<typeof CheckMissedClassSchema>;
export type ClassReminderData = z.infer<typeof ClassReminderJobSchema>;
export type RRClassData = z.infer<typeof RRClassSchema>;
export type DiscountData = z.infer<typeof DiscountSchema>;
export type SubscriptionJobData = z.infer<typeof SubscriptionJobSchema>;
export type CashSubscriptionJobData = z.infer<typeof CashSubscriptionJobSchema>;
export type RecursiveSubscriptionJobData = z.infer<typeof RecursiveSubscriptionJobSchema>;
