import { isFuture } from "date-fns";

export type PromoDiscount = {
    amount: number;
    duration: number;
    durationInMonths: number;
};

export async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

export function getDiscountDuration(promo: {
    duration: "once" | "repeating" | "forever";
    durationInMonths: number | null;
}): number {
    if (promo.duration === "once") return 1;
    if (promo.duration === "repeating") return promo.durationInMonths || 1;
    return Number.MAX_SAFE_INTEGER;
}

export function getNextBillingDate(sub: {
    currentPeriodEnd: Date;
    trialEnd: Date | null;
    status: string;
}): Date {
    if (sub.status === "trialing" && sub.trialEnd && isFuture(sub.trialEnd)) {
        return sub.trialEnd;
    }
    return sub.currentPeriodEnd;
}
