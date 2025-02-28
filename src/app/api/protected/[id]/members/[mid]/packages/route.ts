import { db } from "@/db/db";
import { memberInvoices, memberPackages, transactions } from "@/db/schemas";
import { getStripeCustomer } from "@/libs/server/stripe";
import { calculateCurrentPeriodEnd, calculateInvoice } from "@/libs/utils";
import { MemberPackage, MemberPlan } from "@/types/member";
import { MemberInvoice } from "@/types";
import { NextResponse } from "next/server";
import { Transaction } from "@/types";
import Stripe from "stripe";

type PackageProps = {
    id: number,
    mid: number
}

export async function GET(req: Request, props: { params: Promise<PackageProps> }) {
    const params = await props.params;

    try {
        const packages = await db.query.memberPackages.findMany({
            where: (memberPackage, { eq }) => eq(memberPackage.beneficiaryId, params.mid),
            with: {
                plan: true,
                payer: {
                    columns: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    }
                }
            }
        })

        return NextResponse.json(packages, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}


export async function POST(req: Request, props: { params: Promise<PackageProps> }) {
    const params = await props.params;
    const { stripePaymentMethod, other, ...data } = await req.json();

    try {
        const plan = await db.query.memberPlans.findFirst({
            where: (memberPlan, { eq }) => eq(memberPlan.id, data.memberPlanId)
        })

        if (!plan) {
            return NextResponse.json({ error: "No valid plan not found" }, { status: 404 })
        }

        const locationState = await db.query.locationState.findFirst({
            where: (locationState, { eq }) => eq(locationState.locationId, params.id)
        })

        if (!locationState) {
            return NextResponse.json({ error: "No valid location not found" }, { status: 404 })
        }

        let { newTransaction, newPkg, newInvoice } = createPackage(data, plan, params)
        if (data.paymentType === "card") {

            const stripe = await getStripeCustomer(params)
            const { clientSecret } = await stripe.createPaymentIntent(plan.price, {
                paymentMethod: stripePaymentMethod.id,
                currency: plan.currency,
                applicationFeePercent: (locationState.settings?.applicationFeePercent / 100),
                description: `One time payment for ${plan.name}`
            })

            if (clientSecret) {
                newTransaction.status = "paid"
                newTransaction.metadata = {
                    card: { brand: stripePaymentMethod.card?.brand, last4: stripePaymentMethod.card?.last4 }
                }
                newPkg.status = "active"
                newInvoice.status = "paid"
            }
        } else {
            newTransaction.status = "incomplete"
            newPkg.status = "incomplete"
            newInvoice.status = "unpaid"
        }





        await db.transaction(async (tx) => {
            /** Create Member Package */
            const [{ mpid }] = await tx.insert(memberPackages).values(newPkg).returning({ mpid: memberPackages.id })

            /** Create Transaction */
            await tx.insert(transactions).values({
                ...newTransaction,
                packageId: mpid
            })

            /** Create Invoice */
            await tx.insert(memberInvoices).values(newInvoice)
        })

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
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
    params: PackageProps,
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
        created: today,
    };

    const newInvoice: MemberInvoice = {
        ...calculateInvoice([plan], { taxRate: 0, discount: 0 }),
        ...ids,
        description: `Payment for ${plan.name}`,
        created: today,
        currency: plan.currency,
        paid: false,
        dueDate: new Date(),
        attemptCount: 0,
        status: "unpaid",
    }

    return { newTransaction, newPkg, newInvoice }
}
