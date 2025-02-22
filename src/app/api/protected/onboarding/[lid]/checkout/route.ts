
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { locations, vendors, wallet } from '@/db/schemas';
import { decodeId } from '@/libs/server/sqids';
import { StripePayments } from '@/libs/server/stripe';
import { MonstroPackage } from '@/types/vendor';

import { eq } from 'drizzle-orm';
import * as sendgrid from '@sendgrid/mail';
import { MonstroData } from '@/libs/data';
import { EmailSender } from '@/libs/server/emails';
import { InviteEmailTemplate } from '@/templates/emails/MemberInvite';
import { packages, plans } from "@/libs/data";


const stripe = new StripePayments();
sendgrid.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(req: Request) {
    const data = await req.json();
    const { vendorId, locationId, token, progress } = data;
    const decodedLocationId = decodeId(locationId);

    const paymentPlan = progress.pkgId
        ? packages.find((p: MonstroPackage) => p.id === progress.pkgId)?.paymentPlans.find(p => p.id === progress.paymentPlanId)
        : undefined;

    const plan = !progress.pkgId
        ? plans.find(p => p.id === progress.planId)
        : undefined;

    if (!plan && !paymentPlan) {
        return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    try {
        const vendor = await db.query.vendors.findFirst({
            where: (vendor, { eq }) => eq(vendor.id, vendorId),
            columns: {
                firstName: true,
                lastName: true,
                companyEmail: true,
                phone: true,
            }
        });
        if (!vendor) {
            return NextResponse.json({ error: "Vendor not found" }, { status: 404 })
        }
        const customer = await stripe.createCustomer(vendor, token.id, {
            locationId: locationId,
            vendorId: vendorId
        });

        const walletPayment = 20 * 100;
        const { clientSecret } = await stripe.createPaymentIntent(
            walletPayment,
            customer.id,
            token.card.id,
            { description: `Auto-charge USD ${walletPayment / 100} was successfully added to wallet.` }
        );

        if (!clientSecret) {
            return NextResponse.json({ error: "Payment failed" }, { status: 400 })
        }

        await db.insert(wallet).values({
            locationId: decodedLocationId,
            balance: walletPayment / 100,
            credit: 0,
            rechargeAmount: 20,
            rechargeThreshold: 10,
            lastCharged: new Date(),
            created: new Date()
        }).onConflictDoNothing({ target: [wallet.locationId] });

        if (paymentPlan) {

            const downPayment = Number(paymentPlan.downPayment - paymentPlan.discount) * 100;
            if (paymentPlan.downPayment > 0) {
                await stripe.createPaymentIntent(downPayment, customer.id, token.card.id)
            }
            if (paymentPlan.monthlyPayment > 0) {
                const basicPlan = plans.find(p => p.id === 2);
                await Promise.all([
                    // add payment plan description
                    stripe.createPaymentPlan(paymentPlan, customer.id, vendorId, locationId),
                    stripe.createSubscription(basicPlan!, customer.id, vendorId, locationId, 365)
                ]);
            }
        }

        if (plan && plan.id !== 1) {
            await stripe.createSubscription(plan, customer.id, vendorId, locationId);
        }
        const emailSender = new EmailSender();
        await emailSender.send('stevey@simplygrowonline.com', 'Welcome to Monstro', InviteEmailTemplate, {
            ui: {
                button: "Join the class."
            },
            location: {
                name: 'Gracie\'s Gym',
            },
            monstro: MonstroData,
            member: {
                name: 'John Doe',
            }
        });


        const activeDate = new Date().getTime() * 1000

        await db.transaction(async (tx) => {
            await tx.update(locations).set({
                progress: {
                    ...progress,
                    activeDate,
                    lastRenewalDate: activeDate
                },
                status: "Active",
                updated: new Date()
            }).where(eq(locations.id, decodedLocationId))
            await tx.update(vendors).set({
                stripeCustomerId: customer.id,
                updated: new Date()
            }).where(eq(vendors.id, vendorId))
        })

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

