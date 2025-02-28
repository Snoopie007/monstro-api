import { db } from "@/db/db";
import { memberPackages, transactions } from "@/db/schemas";
import { getStripeCustomer } from "@/libs/server/stripe";
import { calculateCurrentPeriodEnd } from "@/libs/utils";
import { NextResponse } from "next/server";

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
    const { paymentMethod, ...data } = await req.json();

    const today = new Date();
    const startDate = new Date(data.startDate)

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

        const endDate = calculateCurrentPeriodEnd(startDate, plan)
        const expireDate = data.expireDate ? new Date(data.expireDate) : plan.expireDate ? new Date(plan.expireDate) : null

        let newMemberPackage = {
            ...data,
            startDate: startDate,
            endDate: endDate,
            expireDate: expireDate,
            payerId: params.mid,
            beneficiaryId: params.mid,
            memberPlanId: data.memberPlanId,
            totalClassLimit: plan.totalClassLimit,
            created: today,
            status: "incomplete",
        }

        let newTransaction = {
            item: `${plan.name}`,
            description: `One time payment for ${plan.name}`,
            amount: plan.price,
            currency: plan.currency,
            paymentType: plan.type,
            memberId: params.mid,
            locationId: params.id,
            chargeDate: today,
            status: "incomplete",
            transactionType: "incoming",
            paymentMethod: data.paymentType,
            ...(paymentMethod && { metadata: { card: { brand: paymentMethod.card?.brand, last4: paymentMethod.card?.last4 } } }),
            created: today,
        };



        if (data.paymentType === "card") {

            const stripe = await getStripeCustomer(params)
            const { clientSecret } = await stripe.createPaymentIntent(plan.price * 100, {
                paymentMethod: paymentMethod.id,
                currency: plan.currency,
                applicationFeePercent: (locationState.settings?.applicationFeePercent / 100),
                description: `One time payment for ${plan.name}`
            })

            if (clientSecret) {
                newTransaction.status = "paid"
                newMemberPackage.status = "active"
            }
        }



        await db.transaction(async (tx) => {
            /** Create Member Package */
            const [{ mpid }] = await tx.insert(memberPackages).values(newMemberPackage).returning({ mpid: memberPackages.id })

            /** Create Transaction */
            await tx.insert(transactions).values({
                ...newTransaction,
                packageId: mpid
            })
        })

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}



