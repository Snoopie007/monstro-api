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

// Shared by every invoice job producer and worker.
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
    price: z.coerce.number(),
    interval: z.enum(['day', 'week', 'month', 'year']),
    intervalThreshold: z.coerce.number(),
})

export const DiscountSchema = z.object({
    amount: z.coerce.number(),
    duration: z.coerce.number(),
    type: z.enum(["fixed_amount", "percentage"]).optional(),
    value: z.coerce.number().optional(),
})

export const SubscriptionJobSchema = z.object({
    sid: z.string(),
    lid: z.string(),
    member: MemberSchema,
    location: LocationSchema,
    taxRate: z.coerce.number(),
    pricing: PricingSchema,
    discount: DiscountSchema.optional(),
});


export const RecursiveSubscriptionJobSchema = SubscriptionJobSchema.extend({
    recurrenceCount: z.number(),
});

export const CashSubscriptionJobSchema = SubscriptionJobSchema.extend({
    vendorId: z.string(),
});

export const RecursiveCashSubscriptionJobSchema = SubscriptionJobSchema.extend({
    vendorId: z.string(),
    recurrenceCount: z.number(),
});
export const RRClassSchema = z.object({
    plan: z.object({
        id: z.string(),
        classLimitInterval: z.enum(["week", "term", "one"]).nullable(),
        totalClassLimit: z.coerce.number().nullable(),
    }),
    memberPlanId: z.string(),
    lid: z.string(),
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

export const SINGLE_NEXT_JOB = "single:next";
export const CLASS_REMINDER_JOB = "reminder";
export const MISSED_CLASS_JOB = "missed:check";
export const RESERVATION_JOB_LEAD_MS = 2 * 86_400_000;
export const MISSED_CLASS_GRACE_MS = 30 * 60_000;

export const ReservationPlanTypeSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("package"), id: z.string().min(1) }),
    z.object({ type: z.literal("subscription"), id: z.string().min(1) }),
]);

export const SingleNextJobSchema = z.object({
    previousReservationId: z.string().min(1),
    sessionId: z.string().min(1),
    locationId: z.string().min(1),
    memberId: z.string().min(1),
    nextStartOn: z.string().datetime(),
    planType: ReservationPlanTypeSchema,
    snapshot: z.object({
        programId: z.string().min(1),
        programName: z.string().min(1),
        staffId: z.string().min(1),
        sessionDay: z.number().int().min(1).max(7),
        sessionTime: z.string().min(1),
        duration: z.number().int().positive(),
        timezone: z.string().min(1),
    }),
});

export type ClassReminderData = z.infer<typeof ClassReminderJobSchema>;
export type CheckMissedClassData = z.infer<typeof CheckMissedClassSchema>;
export type ReservationPlanType = z.infer<typeof ReservationPlanTypeSchema>;
export type SingleNextJobData = z.infer<typeof SingleNextJobSchema>;

function delayUntil(target: string | Date, offset: number, now: Date) {
    return Math.max(new Date(target).getTime() - now.getTime() - offset, 0);
}

export function singleNextJobId(data: Pick<
    SingleNextJobData,
    "sessionId" | "memberId" | "planType" | "nextStartOn"
>) {
    const identity = `${data.sessionId}-${data.memberId}-${data.planType.id}`;
    return `${SINGLE_NEXT_JOB}:${identity}-${Date.parse(data.nextStartOn)}`;
}

export function singleNextDelay(nextStartOn: string | Date, now = new Date()) {
    return delayUntil(nextStartOn, RESERVATION_JOB_LEAD_MS, now);
}

export function buildClassReminderJob(data: ClassReminderData, now = new Date()) {
    return {
        name: CLASS_REMINDER_JOB,
        data,
        opts: {
            jobId: `class:reminder:${data.rid}-${data.class.startTime.getTime()}`,
            delay: delayUntil(data.class.startTime, RESERVATION_JOB_LEAD_MS, now),
            attempts: 2,
        },
    };
}

export function buildMissedClassJob(data: CheckMissedClassData, now = new Date()) {
    return {
        name: MISSED_CLASS_JOB,
        data,
        opts: {
            jobId: `class:missed:${data.rid}-${data.class.endTime.getTime()}`,
            delay: Math.max(
                data.class.endTime.getTime() - now.getTime() + MISSED_CLASS_GRACE_MS,
                0,
            ),
            attempts: 2,
        },
    };
}


// retry payment jobs
export const RetrySubPaymentSchema = z.object({
    invoiceId: z.string(),
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
export const RankAttendanceJobSchema = z.object({
    mid: z.string(),
    lid: z.string(),
    attendanceId: z.number(),
    amount: z.number().optional(),
});

export type RankAttendanceJobData = z.infer<typeof RankAttendanceJobSchema>;

export type RetrySubPaymentData = z.infer<typeof RetrySubPaymentSchema>;
export type RetryWalletData = z.infer<typeof RetryWalletSchema>;
export type RRClassData = z.infer<typeof RRClassSchema>;
export type DiscountData = z.infer<typeof DiscountSchema>;
export type SubscriptionJobData = z.infer<typeof SubscriptionJobSchema>;
export type CashSubscriptionJobData = z.infer<typeof CashSubscriptionJobSchema>;
export type RecursiveSubscriptionJobData = z.infer<typeof RecursiveSubscriptionJobSchema>;

export const RankAttendanceTriggerSchema = z.object({
    mid: z.string(),
    lid: z.string(),
    duration: z.coerce.number().optional(),
});

export type RankAttendanceTriggerData = z.infer<typeof RankAttendanceTriggerSchema>;
