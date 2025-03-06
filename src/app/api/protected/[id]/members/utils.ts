import { MemberPlan, MemberPackage, MemberInvoice, Transaction, MemberSubscription } from "@/types";
import { isAfter } from "date-fns";


type BaseData = {
    memberPlanId: number,
    programLevelId: number,
    startDate: Date | string,
    paymentMethod: string,
}

type PackageData = BaseData & {
    expireDate?: Date,
    totalClassLimit?: number,
}

type SubscriptionData = BaseData & {
    mid: number;
    id: number;
    memberPlanId: number;
    beneficiaryId: number;
    paymentMethod: string;
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

function calculateCurrentPeriodEnd(startDate: Date, plan: MemberPlan): Date {
    const endDate = new Date(startDate); // Initialize endDate with startDate
    const threshold = plan.intervalThreshold || 1;

    switch (plan.interval) {
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


function createTransaction(
    plan: MemberPlan,
    ids: { memberId: number, locationId: number },
    paymentMethod: string,
): Transaction {
    const today = new Date();
    const description = plan.type === "recurring" ? `Subscription to ${plan.name}` : `One time payment for ${plan.name}`;

    return {
        ...ids,
        chargeDate: today,
        status: "incomplete",
        transactionType: "incoming",
        paymentType: plan.type,
        paymentMethod,
        description,
        amount: plan.price,
        currency: plan.currency,
        item: plan.name,
    };
}

function createInvoice(plan: MemberPlan, ids: { memberId: number, locationId: number }): MemberInvoice {
    const description = plan.type === "recurring" ? `Subscription to ${plan.name}` : `Payment for ${plan.name}`;
    return {
        ...calculateInvoice([plan], { taxRate: 0, discount: 0 }),
        ...ids,
        description,
        currency: plan.currency,
        paid: false,
        status: "draft",
    };
}

function createPackage(
    data: PackageData,
    plan: MemberPlan,
    params: { mid: number, id: number },
): CreatePackageReturn {
    const today = new Date();
    const startDate = new Date(data.startDate);
    const endDate = calculateCurrentPeriodEnd(startDate, plan);
    const expireDate = data.expireDate ? new Date(data.expireDate) : plan.expireDate ? new Date(plan.expireDate) : null;

    const ids = {
        memberId: params.mid,
        locationId: params.id,
        paymentMethod: data.paymentMethod,
    };

    const newPkg: MemberPackage = {
        ...data,
        totalClassAttended: 0,
        startDate: startDate,
        endDate: endDate,
        expireDate: expireDate,
        payerId: params.mid,
        beneficiaryId: params.mid,
        locationId: params.id,
        memberPlanId: data.memberPlanId,
        totalClassLimit: plan.totalClassLimit || 0,
        created: today,
        status: "incomplete",
    };

    const newTransaction = createTransaction(plan, ids, data.paymentMethod);
    const newInvoice = createInvoice(plan, ids);
    return { newTransaction, newPkg, newInvoice };
}

function createSubscription(data: SubscriptionData, plan: MemberPlan): CreateSubscriptionReturn {
    const today = new Date();
    const startDate = new Date(data.startDate);
    const endDate = calculateCurrentPeriodEnd(startDate, plan);

    const ids = {
        memberId: data.mid,
        locationId: data.id,
        paymentMethod: data.paymentMethod,
    };

    let trialEnd: Date | undefined;
    if (data.trialDays) {
        if (isAfter(startDate, today)) {
            trialEnd = new Date(Math.max(startDate.getTime(), (startDate.getTime() + data.trialDays * 24 * 60 * 60 * 1000)));
        } else {
            trialEnd = new Date(Math.max(today.getTime(), (today.getTime() + data.trialDays * 24 * 60 * 60 * 1000)));
        }
    }

    const newSubscription: MemberSubscription = {
        payerId: data.mid,
        beneficiaryId: data.beneficiaryId || data.mid,
        locationId: data.id,
        planId: data.memberPlanId,
        programLevelId: data.programLevelId,
        startDate,
        currentPeriodStart: startDate,
        currentPeriodEnd: endDate,
        paymentType: data.paymentMethod,
        status: "incomplete",
        trialEnd,
    };

    const newTransaction = createTransaction(plan, ids, data.paymentMethod);
    const newInvoice = {
        ...createInvoice(plan, ids),
        forPeriodStart: startDate,
        forPeriodEnd: endDate,
    }

    return { newSubscription, newTransaction, newInvoice };
}



export {
    calculateCurrentPeriodEnd,
    calculateInvoice,
    createPackage,
    createSubscription,
}
