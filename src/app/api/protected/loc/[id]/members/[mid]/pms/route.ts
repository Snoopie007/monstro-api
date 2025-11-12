import { auth } from "@/libs/auth/server";
import { db } from "@/db/db";
import { members } from "@/db/schemas";
import { MemberStripePayments } from "@/libs/server/stripe";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { memberPaymentMethods } from "@/db/schemas";


type Props = {
	params: Promise<{
		id: string;
		mid: string;
	}>
}

export async function POST(req: Request, props: Props) {
	const { id, mid } = await props.params;

	const { token, type, address, ...data } = await req.json();
	console.log(token)
	try {
		// const integrations = await db.query.integrations.findFirst({
		// 	where: (integration, { eq, and }) =>
		// 		and(
		// 			eq(integration.locationId, id),
		// 			eq(integration.service, "stripe")
		// 		),
		// });

		// if (!integrations || !integrations.accountId) {
		// 	throw new Error("Stripe integration not found");
		// }
		// const member = await db.query.members.findFirst({
		// 	where: (member, { eq }) => eq(member.id, mid),
		// });

		// if (!member) {
		// 	throw new Error("Member location not found");
		// }

		// let isDefault = data.default;
		// const stripe = new MemberStripePayments(integrations.accountId);
		// if (!member.stripeCustomerId) {
		// 	const customer = await stripe.createCustomer({
		// 		firstName: member.firstName,
		// 		lastName: member.lastName,
		// 		email: member.email,
		// 		phone: member.phone,
		// 		address: address,
		// 	}, undefined, {
		// 		locationId: id,
		// 		memberId: mid,
		// 	});

		// 	member.stripeCustomerId = customer.id;
		// 	isDefault = true;
		// 	await db.update(members)
		// 		.set({ stripeCustomerId: customer.id, updated: new Date() })
		// 		.where(eq(members.id, mid));
		// }
		// stripe.setCustomer(member.stripeCustomerId);

		// const { paymentMethod } = await stripe.setupIntent(token);


		// if (isDefault) {
		// 	await stripe.updateCustomer({
		// 		invoice_settings: {
		// 			default_payment_method: paymentMethod?.id,
		// 		},
		// 	});
		// }

		// const card = paymentMethod?.card;

		// if (!paymentMethod?.id || !card?.fingerprint || !card?.last4 || !card?.exp_month || !card?.exp_year || !card?.brand) {
		// 	throw new Error("Invalid payment method data");
		// }

		// const [pm] = await db.insert(memberPaymentMethods).values({
		// 	memberId: mid,
		// 	locationId: id,
		// 	type: "card",
		// 	stripeId: paymentMethod.id,
		// 	fingerprint: card.fingerprint,
		// 	isDefault: isDefault,
		// 	last4: card.last4,
		// 	expMonth: card.exp_month,
		// 	expYear: card.exp_year,
		// 	brand: card.brand,

		// }).returning();

		return NextResponse.json({}, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}

export async function PUT(
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
