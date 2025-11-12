import { auth } from "@/libs/auth/server";
import { db } from "@/db/db";
import { members } from "@/db/schemas";
import { MemberStripePayments } from "@/libs/server/stripe";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { memberPaymentMethods, paymentMethods } from "@/db/schemas";
import Stripe from "stripe";
import { PaymentType } from "@/types/";

type Props = {
	params: Promise<{
		id: string;
		mid: string;
	}>
}

export async function POST(req: Request, props: Props) {
	const { id, mid } = await props.params;

	const { tokenId, type, address } = await req.json();

	try {
		const integrations = await db.query.integrations.findFirst({
			where: (integration, { eq, and }) =>
				and(
					eq(integration.locationId, id),
					eq(integration.service, "stripe")
				),
		});

		if (!integrations || !integrations.accountId) {
			throw new Error("Stripe integration not found");
		}
		const member = await db.query.members.findFirst({
			where: (member, { eq }) => eq(member.id, mid),
		});

		if (!member) {
			throw new Error("Member location not found");
		}

		// let isDefault = data.default;
		const stripe = new MemberStripePayments(integrations.accountId);
		if (!member.stripeCustomerId) {
			const customer = await stripe.createCustomer({
				firstName: member.firstName,
				lastName: member.lastName,
				email: member.email,
				phone: member.phone,
				address: address,
			}, undefined, {
				locationId: id,
				memberId: mid,
			});

			member.stripeCustomerId = customer.id;

			await db.update(members)
				.set({ stripeCustomerId: customer.id, updated: new Date() })
				.where(eq(members.id, mid));
		}
		stripe.setCustomer(member.stripeCustomerId);

		//  Refretch Token with fingerprint
		const token = await stripe.getToken(tokenId);
		// Fetch list of payment methods from stripe
		const stripePaymentMethods = await stripe.getPaymentMethods(member.stripeCustomerId, { type: type });


		// Find the payment method with the same fingerprint
		let stripePaymentMethod: Stripe.PaymentMethod | undefined = undefined;
		if (type === "card" && token.card) {
			stripePaymentMethod = stripePaymentMethods.data.find((pm: Stripe.PaymentMethod) => {
				return pm.card?.fingerprint === token.card?.fingerprint;
			});
		}

		// Find the payment method with the same fingerprint
		if (type === "us_bank_account" && token.bank_account) {
			stripePaymentMethod = stripePaymentMethods.data.find((pm: Stripe.PaymentMethod) => {
				return pm.us_bank_account?.fingerprint === token.bank_account?.fingerprint;
			});
		}

		// If no payment method found, create a new one
		if (!stripePaymentMethod) {
			const { paymentMethod: newStripePaymentMethod } = await stripe.setupIntent(tokenId);
			stripePaymentMethod = newStripePaymentMethod;
		}


		const { card, us_bank_account } = stripePaymentMethod;
		let fingerprint = card?.fingerprint || us_bank_account?.fingerprint;

		if (!fingerprint) {
			throw new Error("Fingerprint is required");
		}

		// Check if the payment method already exists
		let pm = await db.query.paymentMethods.findFirst({
			where: (paymentMethod, { eq }) => eq(paymentMethod.fingerprint, fingerprint),
		});

		if (!pm) {

			const [newPaymentMethod] = await db.insert(paymentMethods).values({
				fingerprint: fingerprint,
				stripeId: stripePaymentMethod.id,
				type: type as PaymentType,
				card: card ? {
					brand: card.brand,
					last4: card.last4,
					expMonth: card.exp_month,
					expYear: card.exp_year,
				} : null,
				usBankAccount: us_bank_account ? {
					bankName: us_bank_account.bank_name,
					accountType: us_bank_account.account_type,
					last4: us_bank_account.last4,
				} : null,
			}).onConflictDoNothing({
				target: [paymentMethods.fingerprint],
			}).returning();

			pm = newPaymentMethod;
		}

		if (!pm) {
			throw new Error("Failed to create payment method");
		}

		await db.insert(memberPaymentMethods).values({
			paymentMethodId: pm.id,
			memberId: mid,
			locationId: id,
			isDefault: false,
		}).onConflictDoNothing({
			target: [memberPaymentMethods.paymentMethodId, memberPaymentMethods.memberId, memberPaymentMethods.locationId],
		});

		return NextResponse.json({
			...pm,
			isDefault: false,
		}, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}

export async function PATCH(
	req: Request,
	props: { params: Promise<{ id: string; mid: string }> }
) {
	const params = await props.params;
	const session = await auth();
	const data = await req.json();
	try {
		if (session) {
			const integrations = await db.query.integrations.findFirst({
				where: (integration, { eq }) =>
					and(
						eq(integration.locationId, params.id),
						eq(integration.service, "stripe")
					),
				columns: {
					accessToken: true,
				},
			});

			let paymentMethod: any;
			if (integrations?.accessToken) {
				const stripe = require("stripe")(integrations?.accessToken);
				paymentMethod = await stripe.customers.update(data.customerId, {
					invoice_settings: {
						default_payment_method: data.paymentMethodId,
					},
				});
			} else {
				return NextResponse.json(
					{ error: "Something Went Wrong" },
					{ status: 500 }
				);
			}
			return NextResponse.json(
				{ message: "Success", data: paymentMethod.data },
				{ status: 200 }
			);
		} else {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}

export async function DELETE(
	req: Request,
	props: { params: Promise<{ id: string; mid: string }> }
) {
	const params = await props.params;
	const session = await auth();
	const { searchParams } = new URL(req.url);
	const paymentMethodId = searchParams.get("paymentMethodId");
	try {
		if (!paymentMethodId) {
			return NextResponse.json(
				{ error: "Payment Method Id is required" },
				{ status: 400 }
			);
		}
		if (session) {
			const integrations = await db.query.integrations.findFirst({
				where: (integration, { eq }) =>
					and(
						eq(integration.locationId, params.id),
						eq(integration.service, "stripe")
					),
				columns: {
					accessToken: true,
				},
			});
			let paymentMethod: any;
			if (integrations?.accessToken) {
				const stripe = require("stripe")(integrations?.accessToken);
				paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
			} else {
				return NextResponse.json(
					{ error: "Something Went Wrong" },
					{ status: 500 }
				);
			}
			return NextResponse.json(
				{ message: "Success", data: paymentMethod.data },
				{ status: 200 }
			);
		}
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}
