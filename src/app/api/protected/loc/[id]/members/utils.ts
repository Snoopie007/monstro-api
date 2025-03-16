import { MemberPlan, MemberPackage, MemberInvoice, Transaction, MemberSubscription } from "@/types";
import { isAfter } from "date-fns";


type BaseData = {
    memberPlanId: number,
    locationId: number;
    memberId: number;
    programId: number,
    beneficiaryId: number;
    startDate: Date | string,
    paymentMethod: "card" | "cash" | "check" | "zelle" | "venmo" | "paypal" | "apple" | "google",
}

type PackageData = BaseData & {
    expireDate?: Date,
    totalClassLimit?: number,
}

type SubscriptionData = BaseData & {
    startDate: string;
    endDate?: string;
    trialDays?: number;
}

type BaseReturnType = {
    newTransaction: Transaction,
    newInvoice: MemberInvoice
}

type CreatePackageReturn = BaseReturnType & {
    newPkg: MemberPackage,
}

type CreateSubscriptionReturn = BaseReturnType & {
    newSubscription: MemberSubscription;
}

function calculateCurrentPeriodEnd(startDate: Date, interval: string, threshold: number): Date {
    const endDate = new Date(startDate); // Initialize endDate with startDate

    switch (interval) {
        case "day":
            endDate.setDate(endDate.getDate() + threshold);
            break;
        case "week":
            endDate.setDate(endDate.getDate() + threshold * 7);
            break;
        case "month":
            endDate.setMonth(endDate.getMonth() + threshold);
            break;
        case "year":
            endDate.setFullYear(endDate.getFullYear() + threshold);
            break;
        default:
            throw new Error("Invalid plan interval");
    }
    return endDate;
}

function calculateInvoice(plans: MemberPlan[], rest: { taxRate: number, discount: number }) {
    const items: { name: string, quantity: number, price: number }[] = []
    let subtotal = 0

    plans.forEach(plan => {
        items.push({
            name: plan.name,
            quantity: 1,
            price: plan.price,
        })
        subtotal += plan.price
    })
    const tax = (subtotal * rest.taxRate) / 100
    const total = subtotal - rest.discount + tax
    return {

        items,
        tax: rest.taxRate,
        total,
        discount: rest.discount,
        subtotal,

    }
}

type RestProps = { memberId: number, locationId: number, paymentMethod: string }

function createTransaction(
    plan: MemberPlan,
    rest: RestProps
): Transaction {
    const today = new Date();
    const description = plan.type === "recurring" ? `Subscription to ${plan.name}` : `One time payment for ${plan.name}`;

    return {
        ...rest,
        chargeDate: today,
        status: "incomplete",
        transactionType: "incoming",
        paymentType: plan.type,
        description,
        amount: plan.price,
        currency: plan.currency,
        item: plan.name,
    };
}

function createInvoice(plan: MemberPlan, rest: RestProps): MemberInvoice {
    const description = plan.type === "recurring" ? `Subscription to ${plan.name}` : `Payment for ${plan.name}`;
    return {
        ...calculateInvoice([plan], { taxRate: 0, discount: 0 }),
        memberId: rest.memberId,
        locationId: rest.locationId,
        description,
        currency: plan.currency,
        paid: false,
        status: "draft",
    };
}

function createPackage(
    data: PackageData,
    plan: MemberPlan
): CreatePackageReturn {
    const today = new Date();
    const startDate = data.startDate ? new Date(data.startDate) : today;
    const { beneficiaryId, totalClassLimit, ...rest } = data;
    const { expireInterval, expireThreshold } = plan;

    let expireDate: Date | null = null;
    if (data.expireDate) {
        expireDate = new Date(data.expireDate);
    } else if (expireInterval && expireThreshold) {
        expireDate = calculateCurrentPeriodEnd(startDate, expireInterval, expireThreshold);
    }

    const newPkg: MemberPackage = {
        ...rest,
        payerId: rest.memberId,
        beneficiaryId: beneficiaryId || rest.memberId,
        locationId: rest.locationId,
        startDate: startDate,
        expireDate,
        totalClassLimit: totalClassLimit || 0,
        created: today,
        status: "incomplete",
    };

    const newTransaction = createTransaction(plan, rest);
    const newInvoice = createInvoice(plan, rest);
    return { newTransaction, newPkg, newInvoice };
}

function createSubscription(data: SubscriptionData, plan: MemberPlan): CreateSubscriptionReturn {
    const today = new Date();
    const startDate = data.startDate ? new Date(data.startDate) : today;
    const periodEnd = calculateCurrentPeriodEnd(startDate, plan.interval!, plan.intervalThreshold!);

    const { trialDays, endDate, beneficiaryId, ...rest } = data;

    let trialEnd: Date | undefined;
    if (data.trialDays) {
        if (isAfter(startDate, today)) {
            trialEnd = new Date(Math.max(startDate.getTime(), (startDate.getTime() + data.trialDays * 24 * 60 * 60 * 1000)));
        } else {
            trialEnd = new Date(Math.max(today.getTime(), (today.getTime() + data.trialDays * 24 * 60 * 60 * 1000)));
        }
    }

    const newSubscription: MemberSubscription = {
        ...data,
        payerId: rest.memberId,
        beneficiaryId: beneficiaryId || rest.memberId,
        startDate: startDate,
        currentPeriodStart: startDate,
        currentPeriodEnd: periodEnd,
        cancelAt: data.endDate ? new Date(data.endDate) : undefined,
        status: "incomplete",
        trialEnd,
    };

    const newTransaction = createTransaction(plan, rest);
    const newInvoice = {
        ...createInvoice(plan, rest),
        forPeriodStart: startDate,
        forPeriodEnd: periodEnd,
    }

    return { newSubscription, newTransaction, newInvoice };
}



export {
    calculateCurrentPeriodEnd,
    calculateInvoice,
    createPackage,
    createSubscription,
    createInvoice
}
