import { MemberPlan, MemberPackage, MemberInvoice, Transaction } from "@/types";



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


type createPackageReturnType = {
    newTransaction: Transaction,
    newPkg: MemberPackage,
    newInvoice: MemberInvoice
}

type PackageData = {
    memberPlanId: number,
    startDate: Date,
    expireDate?: Date,
    paymentMethod: string,
    totalClassLimit?: number,
}


function createPackage(
    data: PackageData,
    plan: MemberPlan,
    params: { mid: number, id: number },
): createPackageReturnType {

    const today = new Date();

    const startDate = new Date(data.startDate)
    const endDate = calculateCurrentPeriodEnd(startDate, plan)
    const expireDate = data.expireDate ? new Date(data.expireDate) : plan.expireDate ? new Date(plan.expireDate) : null

    const ids = {
        memberId: params.mid,
        locationId: params.id,
    }

    const newPkg: MemberPackage = {
        ...data,
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
    }

    const newTransaction: Transaction = {
        ...data,
        ...ids,
        item: `${plan.name}`,
        description: `One time payment for ${plan.name}`,
        amount: plan.price,
        currency: plan.currency,
        paymentType: plan.type,
        chargeDate: today,
        status: "incomplete",
        transactionType: "incoming",
    };

    const newInvoice: MemberInvoice = {
        ...calculateInvoice([plan], { taxRate: 0, discount: 0 }),
        ...ids,
        description: `Payment for ${plan.name}`,
        currency: plan.currency,
        paid: false,
        status: "draft",
    }

    return { newTransaction, newPkg, newInvoice }
}

export {
    calculateCurrentPeriodEnd,
    calculateInvoice,
    createPackage
}
