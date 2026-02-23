import { db } from "@/db/db";
import { memberLocations, memberPackages, memberPlanPricing, memberInvoices, promos } from "@subtrees/schemas";
import { MemberStripePayments } from "@/libs/server/stripe";
import { eq, and, sql } from "drizzle-orm";

import { PaymentType } from "@subtrees/types";
import { NextRequest, NextResponse } from "next/server";
import { calculateExpiresAt, calculateStripeFeeAmount, calculateTax, validatePromoForCheckout } from "../../utils";

type Props = {
	params: Promise<{
		id: string;
		mid: string;
	}>
};

export async function GET(req: NextRequest, props: Props) {
	const { id, mid } = await props.params;

	try {
		const packages = await db.query.memberPackages.findMany({
			where: (memberPackage, { eq, and }) =>
				and(
					eq(memberPackage.memberId, mid),
					eq(memberPackage.locationId, id)
				),
			with: {
				pricing: {
					with: {
						plan: true,
					}
				},
			},
		});

		// Transform to include plan at top level for backwards compatibility
		const transformedPackages = packages.map(pkg => ({
			...pkg,
			plan: pkg.pricing?.plan
		}))

		return NextResponse.json(transformedPackages, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}

export async function POST(req: NextRequest, props: Props) {

	const { id, mid } = await props.params;
	const body = await req.json();

	const { paymentMethod, paymentType, trialDays, pricingId, promoCode, ...data } = body;
	try {
		if (!pricingId) {
			return NextResponse.json({ error: "Pricing selection is required" }, { status: 400 });
		}

		const pricing = await db.query.memberPlanPricing.findFirst({
			where: eq(memberPlanPricing.id, pricingId)
		});

		if (!pricing) {
			return NextResponse.json({ error: "Pricing option not found" }, { status: 404 });
		}

		let promoId: string | undefined;
		let discountAmount = 0;


		const plan = await db.query.memberPlans.findFirst({
			where: (memberPlan, { eq }) => eq(memberPlan.id, data.memberPlanId)
		})

		if (!plan) {
			throw new Error("Plan not found")
		}

		if (pricing.memberPlanId !== plan.id) {
			return NextResponse.json({ error: "Pricing does not belong to this plan" }, { status: 400 });
		}

		const promoValidation = await validatePromoForCheckout({
			locationId: id,
			memberId: mid,
			pricingId,
			pricingPrice: pricing.price,
			promoCode,
			usageType: "package",
		});

		if (!promoValidation.ok) {
			return NextResponse.json(
				{ error: promoValidation.message, code: promoValidation.code },
				{ status: promoValidation.status }
			);
		}

		promoId = promoValidation.promoId;
		discountAmount = promoValidation.discountAmount || 0;

		const ml = await db.query.memberLocations.findFirst({
			where: (memberLocation, { eq, and }) => and(
				eq(memberLocation.memberId, mid),
				eq(memberLocation.locationId, id)
			),
			with: {
				member: true,
				location: {
					with: {
						taxRates: true,
						locationState: true
					}
				}
			}
		});

		if (!ml) {
			throw new Error("No member location found")
		}

		const { location: { taxRates, locationState }, member } = ml;

		if (!member || !member.stripeCustomerId) {
			throw new Error("Member not found");
		}

		const integration = await db.query.integrations.findFirst({
			where: (integration, { eq, and }) => and(
				eq(integration.locationId, id),
				eq(integration.service, "stripe")
			),
			columns: {
				accountId: true,
			},
		});

		if (!integration) {
			throw new Error("Integration not found");
		}

		const stripe = new MemberStripePayments(integration.accountId)
		stripe.setCustomer(member.stripeCustomerId);

		const today = new Date();
		const startDate = data.startDate ? new Date(data.startDate) : today;

		// Calculate expire date from pricing term if set
		let expireDate: Date | null = null;
		if (data.expireDate) {
			expireDate = new Date(data.expireDate);
		} else {
			expireDate = calculateExpiresAt(startDate, pricing.expireInterval, pricing.expireThreshold);
		}

		const discountedPrice = Math.max(0, pricing.price - discountAmount);
		const tax = calculateTax(discountedPrice, taxRates);
		let subTotal = discountedPrice;
		let total = subTotal + tax;
		const monstroFee = Math.floor(subTotal * (locationState.usagePercent / 100));
		const stripeFee = calculateStripeFeeAmount((
			locationState.settings.passOnFees ? total : total + monstroFee
		), paymentMethod.type as PaymentType);

		const applicationFeeAmount = monstroFee + stripeFee;

		if (locationState.settings.passOnFees) {
			total += applicationFeeAmount;
			subTotal += applicationFeeAmount;
		}

        const { pkg, invoiceId } = await db.transaction(async (tx) => {
            const CommonData = {
                locationId: id,
                memberId: mid,
                paymentType,
            }

            const [pkg] = await tx.insert(memberPackages).values({
                ...CommonData,
                stripePaymentId: null,
                memberPlanId: plan.id,
                memberPlanPricingId: pricing.id,
                promoId,
                ...data,
                status: "incomplete",
                startDate,
                expireDate,
                makeUpCredits: 0,
                allowMakeUpCarryOver: false,
            }).returning();

            const [invoice] = await tx.insert(memberInvoices).values({
                memberId: mid,
                locationId: id,
                memberPlanId: pkg.id,
                description: `Payment for ${plan.name} - ${pricing.name}`,
                items: [{
                    name: `${plan.name} - ${pricing.name}`,
                    price: discountedPrice,
                    quantity: 1,
                }],
                status: "draft",
                paymentType: paymentMethod.type as PaymentType,
                invoiceType: "one-off",
                subTotal: discountedPrice,
                total,
                tax,
                currency: plan.currency,
                dueDate: new Date(),
                metadata: {
                    packageId: pkg.id,
                    pricingId: pricing.id,
                },
            }).returning({
                id: memberInvoices.id,
            });

            await tx
                .update(memberLocations)
                .set({
                    status: "incomplete",
                    updated: new Date(),
                })
                .where(
					and(
						eq(memberLocations.memberId, mid),
						eq(memberLocations.locationId, id)
					)
				);
            return { pkg, invoiceId: invoice.id };
        });

        const { clientSecret } = await stripe.createPaymentIntent(total, applicationFeeAmount, {
            paymentMethod: paymentMethod.id,
            currency: plan.currency,
            description: `Payment for ${plan.name} - ${pricing.name}`,
            productName: plan.name,
            unitCost: subTotal,
            tax,
            metadata: {
                invoiceId,
                memberPlanId: pkg.id,
                locationId: id,
                memberId: mid,
                planId: plan.id,
                pricingId: pricing.id,
                startDate: today.toISOString(),
            },
        });

        await db.update(memberPackages).set({
            stripePaymentId: clientSecret.split("_secret_")[0] || null,
            updated: new Date(),
        }).where(eq(memberPackages.id, pkg.id));

		// Increment redemption count if promo was used
		if (promoId) {
			await db.update(promos)
				.set({ redemptionCount: sql`${promos.redemptionCount} + 1` })
				.where(eq(promos.id, promoId));
		}

        return NextResponse.json({ ...pkg, stripePaymentId: clientSecret.split("_secret_")[0] || null, plan, pricing }, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}
