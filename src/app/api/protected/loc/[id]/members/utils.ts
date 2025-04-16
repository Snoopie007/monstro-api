import { MemberPlan, MemberPackage, MemberInvoice, Transaction, MemberSubscription } from "@/types";
import { isAfter } from "date-fns";


type BaseData = {
    memberPlanId: number,
    locationId: number;
    memberId: number;
    programId: number,
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

function calculateInvoice(plans: MemberPlan[], tax: number, discount: number) {
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
    const total = subtotal - discount + tax
    return {
        items,
        tax,
        total,
        discount,
        subtotal,

    }
}

type RestProps = { memberId: number, locationId: number, paymentMethod: string }

function createTransaction(
    plan: MemberPlan,
    props: RestProps,
    tax: number
): Transaction {
    const today = new Date();
    const description = plan.type === "recurring" ? `Subscription to ${plan.name}` : `One time payment for ${plan.name}`;

    return {
        ...props,
        chargeDate: today,
        status: "incomplete",
        transactionType: "incoming",
        paymentType: plan.type,
        description,
        tax,
        amount: plan.price,
        currency: plan.currency,
        item: plan.name,
    };
}

function createInvoice(plan: MemberPlan, props: RestProps, tax: number): MemberInvoice {
    const description = plan.type === "recurring" ? `Subscription to ${plan.name}` : `Payment for ${plan.name}`;
    return {
        ...calculateInvoice([plan], tax, 0),
        memberId: props.memberId,
        locationId: props.locationId,
        description,
        currency: plan.currency,
        paid: false,
        status: "draft",
    };
}

function createPackage(
    data: PackageData,
    plan: MemberPlan,
    tax: number
): CreatePackageReturn {
    const today = new Date();
    const startDate = data.startDate ? new Date(data.startDate) : today;
    const { totalClassLimit, ...rest } = data;
    const { expireInterval, expireThreshold } = plan;

    let expireDate: Date | null = null;
    if (data.expireDate) {
        expireDate = new Date(data.expireDate);
    } else if (expireInterval && expireThreshold) {
        expireDate = calculateCurrentPeriodEnd(startDate, expireInterval, expireThreshold);
    }

    const newPkg: MemberPackage = {
        ...rest,
        locationId: rest.locationId,
        startDate: startDate,
        expireDate,
        totalClassLimit: totalClassLimit || 0,
        created: today,
        status: "incomplete",
    };

    const newTransaction = createTransaction(plan, rest, tax);
    const newInvoice = createInvoice(plan, rest, tax);
    return { newTransaction, newPkg, newInvoice };
}

function createSubscription(data: SubscriptionData, plan: MemberPlan, tax: number): CreateSubscriptionReturn {
    const today = new Date();
    const startDate = data.startDate ? new Date(data.startDate) : today;
    const periodEnd = calculateCurrentPeriodEnd(startDate, plan.interval!, plan.intervalThreshold!);

    const { trialDays, endDate, ...rest } = data;

    let trialEnd: Date | undefined;
    if (data.trialDays) {
        if (isAfter(startDate, today)) {
            trialEnd = new Date(Math.max(startDate.getTime(), (startDate.getTime() + data.trialDays * 24 * 60 * 60 * 1000)));
        } else {
            trialEnd = new Date(Math.max(today.getTime(), (today.getTime() + data.trialDays * 24 * 60 * 60 * 1000)));
        }
    }

    const newSubscription: MemberSubscription = {
        ...rest,
        memberId: rest.memberId,
        startDate: startDate,
        currentPeriodStart: startDate,
        currentPeriodEnd: periodEnd,
        cancelAt: data.endDate ? new Date(data.endDate) : undefined,
        status: "incomplete",
        trialEnd,
    };

    const newTransaction = createTransaction(plan, rest, tax);
    const newInvoice = {
        ...createInvoice(plan, rest, tax),
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
