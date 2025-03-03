import { db } from "@/db/db";
import { memberInvoices, memberPackages, transactions } from "@/db/schemas";
import { getStripeCustomer } from "@/libs/server/stripe";
import { createPackage } from "../../utils";
import { NextResponse } from "next/server";

type PackageProps = {
    id: number,
    mid: number
}

export async function GET(req: Request, props: { params: Promise<PackageProps> }) {
    const params = await props.params;

    try {
        const packages = await db.query.memberPackages.findMany({
            where: (memberPackage, { eq, and }) => and(
                eq(memberPackage.beneficiaryId, params.mid),
                eq(memberPackage.locationId, params.id)
            ),
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
        let clientSecret: string | undefined;
        if (data.paymentMethod === "card") {

            const stripe = await getStripeCustomer(params)
            const res = await stripe.createPaymentIntent(plan.price, {
                paymentMethod: stripePaymentMethod.id,
                currency: plan.currency,
                applicationFeePercent: (locationState.usagePercent / 100),
                description: `One time payment for ${plan.name}`
            })

            if (res.clientSecret) {
                clientSecret = res.clientSecret
                newTransaction.metadata = {
                    card: { brand: stripePaymentMethod.card?.brand, last4: stripePaymentMethod.card?.last4 }
                }

            }
        }

        if (data.paymentType !== "card" || clientSecret) {
            newTransaction.status = "paid"
            newPkg.status = "active"
            newInvoice.status = "paid"
        }


        await db.transaction(async (tx) => {
            /** Create Member Package */
            const [{ mpid }] = await tx.insert(memberPackages).values(newPkg).returning({ mpid: memberPackages.id })
            /** Create Invoice */
            const [{ iid }] = await tx.insert(memberInvoices).values({
                ...newInvoice,
                memberPackageId: mpid
            }).returning({ iid: memberInvoices.id })
            /** Create Transaction */
            await tx.insert(transactions).values({
                ...newTransaction,
                invoiceId: iid,
                packageId: mpid
            })

            // Add to reservation
        })

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}
