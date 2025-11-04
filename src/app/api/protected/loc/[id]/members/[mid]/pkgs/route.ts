import { db } from "@/db/db";
import { memberInvoices, memberPackages, transactions, locationState, integrations, members, locations } from "@/db/schemas";
import { getStripeCustomer } from "@/libs/server/stripe";
import { createPackage } from "../../utils";
import { NextRequest, NextResponse } from "next/server";
import { MemberPackage } from "@/types";
import { eq, and } from "drizzle-orm";
import { createMonstroApiClient } from "@/libs/api";

type PackageProps = {
	id: string;
	mid: string;
};

export async function GET(
	req: NextRequest,
	props: { params: Promise<PackageProps> }
) {
	const params = await props.params;

	try {
		const packages = await db.query.memberPackages.findMany({
			where: (memberPackage, { eq, and }) =>
				and(
					eq(memberPackage.memberId, params.mid),
					eq(memberPackage.locationId, params.id)
				),
			with: {
				plan: true,
			},
		});

		return NextResponse.json(packages, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}

export async function POST(
	req: NextRequest,
	props: { params: Promise<PackageProps> }
) {
	const params = await props.params;
	const { stripePaymentMethod, hasIncompletePlan, other, ...data } =
		await req.json();

	try {
		const plan = await db.query.memberPlans.findFirst({
			where: (memberPlan, { eq }) => eq(memberPlan.id, data.memberPlanId),
		});

		if (!plan) {
			return NextResponse.json(
				{ error: "No valid plan not found" },
				{ status: 404 }
			);
		}

		const locationState = await db.query.locationState.findFirst({
			where: (locationState, { eq }) => eq(locationState.locationId, params.id),
		});

		if (!locationState) {
			return NextResponse.json(
				{ error: "No valid location not found" },
				{ status: 404 }
			);
		}

		const tax = Math.floor(plan.price * (locationState.taxRate / 10000));
		const amount = plan.price + tax;

		const { newTransaction, newPkg, newInvoice } = createPackage(
			{
				...data,
				memberId: params.mid,
				locationId: params.id,
			},
			plan,
			tax
		);

		let clientSecret: string | undefined;
		let md = {};

		if (data.paymentMethod === "card") {
			const stripe = await getStripeCustomer(params);
			const res = await stripe.createPaymentIntent(amount, {
				paymentMethod: stripePaymentMethod.id,
				currency: plan.currency,
				applicationFeePercent: locationState.usagePercent / 100,
				description: `One time payment for ${plan.name}`,
				metadata: {
					planId: plan.id,
					tax,
					startDate: newPkg.startDate,
					locationId: params.id,
					memberId: params.mid,
				},
			});
			if (!res.clientSecret) {
				return NextResponse.json(
					{ error: "Failed to create payment intent" },
					{ status: 500 }
				);
			}
			newTransaction.status = "paid";
			newTransaction.type = "inbound";
			newPkg.status = "active";
			newInvoice.status = "paid";
			const cardInfo =
				data.token?.card || data.stripePaymentMethod?.card || null;

			if (cardInfo) {
				md = {
					card: { brand: cardInfo.brand, last4: cardInfo.last4 },
				};
			}
		} else if (data.paymentMethod === "cash") {
			// Manual payment - package active immediately
			newPkg.status = "active";
			
			// Invoice starts as DRAFT (staff must mark as sent)
			newInvoice.status = "draft";
			newInvoice.paymentMethod = "manual";
			newInvoice.invoiceType = "one-off";
			// NO sentAt - set when staff marks as "sent"
			
			// Transaction created as incomplete
			newTransaction.status = "incomplete";
			newTransaction.paymentMethod = "cash";
			newTransaction.type = "inbound";
			
			md = {
				paymentMethod: "cash",
				createdAt: new Date().toISOString(),
			};
		}

		const newPackage = await db.transaction(async (tx) => {
			const stripePaymentId = clientSecret?.split("_secret_")[0];
			const [pkg] = await tx
				.insert(memberPackages)
				.values({
					...newPkg,
					stripePaymentId,
					metadata: md,
				})
				.returning();
			/** Create Invoice */
			const [{ iid }] = await tx
				.insert(memberInvoices)
				.values({
					...newInvoice,
					memberPackageId: pkg.id,
				})
				.returning({ iid: memberInvoices.id });
			/** Create Transaction */
			await tx.insert(transactions).values({
				...newTransaction,
				invoiceId: iid,
				packageId: pkg.id,
				metadata: md,
			});
			return pkg;
		});

		// Send invoice reminder email immediately for manual/cash packages (only for plan_id >= 2, no Stripe)
		if (data.paymentMethod === "cash" || data.paymentMethod === "manual") {
			try {
				// Check if location has plan_id >= 2
				if (locationState?.planId && locationState.planId >= 2) {
					// Check if location has NO Stripe integration
					const hasStripe = await db.query.integrations.findFirst({
						where: and(
							eq(integrations.locationId, params.id),
							eq(integrations.service, 'stripe')
						)
					});
					
					if (!hasStripe) {
						// Fetch member and location details
						const member = await db.query.members.findFirst({
							where: eq(members.id, params.mid)
						});
						
						const location = await db.query.locations.findFirst({
							where: eq(locations.id, params.id)
						});
						
						if (member && location) {
							const apiClient = createMonstroApiClient();
							await apiClient.post('/protected/locations/email', {
								recipient: member.email,
								subject: `Invoice: ${plan.name}`,
								template: 'InvoiceReminderEmail',
								data: {
									member: {
										firstName: member.firstName,
										lastName: member.lastName,
										email: member.email,
									},
									invoice: {
										id: newPackage.id,
										total: newInvoice.total,
										dueDate: newInvoice.dueDate.toISOString(),
										description: newInvoice.description || `${plan.name} - One-time Payment`,
										items: newInvoice.items as any[],
									},
									location: {
										name: location.name,
										address: location.address || '',
									},
									monstro: {
										fullAddress: 'PO Box 123, City, State 12345\nCopyright 2025 Monstro',
										privacyUrl: 'https://mymonstro.com/privacy',
										unsubscribeUrl: 'https://mymonstro.com/unsubscribe',
									},
								}
							});
							console.log(`📧 Sent invoice reminder email for package ${newPackage.id}`);
						}
					}
				}
			} catch (error) {
				console.error('Failed to send invoice reminder email:', error);
				// Don't fail the request if email fails
			}
		}

		return NextResponse.json({
			...newPackage,
			plan,
		} as MemberPackage, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}
