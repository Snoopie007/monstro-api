import { db } from "@/db/db";
import type { Context, ToolCall } from "./types";

export async function GetMemberPlans(_toolCall: ToolCall, context: Context): Promise<string> {
	const { ml } = context;
	const plans: Array<Record<string, unknown>> = [];

	try {
		const subs = await db.query.memberSubscriptions.findMany({
			where: (subs, { eq }) => eq(subs.memberId, ml.memberId),
		});
		const pkgs = await db.query.memberPackages.findMany({
			where: (pkgs, { eq }) => eq(pkgs.memberId, ml.memberId),
		});

		const pricingIds = new Set<string>();
		subs.forEach((sub) => pricingIds.add(sub.memberPlanPricingId));
		pkgs.forEach((pkg) => pricingIds.add(pkg.memberPlanPricingId));

		const pricings = await db.query.memberPlanPricing.findMany({
			where: (p, { inArray }) => inArray(p.id, Array.from(pricingIds)),
			columns: {
				id: true,
				name: true,
				price: true,
				interval: true,
				intervalThreshold: true,
			},
			with: {
				plan: {
					columns: {
						id: true,
						name: true,
						familyMemberLimit: true,
					},
					with: {
						planPrograms: {
							with: {
								program: {
									columns: {
										id: true,
										name: true,
									},
								},
							},
						},
					},
				},
			},
		});

		function getPricingById(id: string) {
			return pricings.find((p) => p.id === id);
		}

		for (const sub of subs) {
			const pricing = getPricingById(sub.memberPlanPricingId);
			if (!pricing || !pricing.plan) {
				console.warn(`No pricing/plan found for subscription ${sub.id}`);
				continue;
			}
			const plan = pricing.plan;
			const programs = Array.isArray(plan.planPrograms)
				? plan.planPrograms.map((p: { program: { id: string; name: string } }) => ({
					programId: p.program.id,
					programName: p.program.name,
				}))
				: [];

			plans.push({
				planName: plan.name,
				subscriptionId: sub.id,
				familyLimit: plan.familyMemberLimit,
				price: pricing.price,
				interval: pricing.interval,
				intervalThreshold: pricing.intervalThreshold,
				includedPrograms: programs,
				startDate: sub.startDate || sub.created,
				status: sub.status,
			});
		}

		for (const pkg of pkgs) {
			const pricing = getPricingById(pkg.memberPlanPricingId);
			if (!pricing || !pricing.plan) {
				console.warn(`No pricing/plan found for package ${pkg.id}`);
				continue;
			}
			const plan = pricing.plan;
			const programs = Array.isArray(plan.planPrograms)
				? plan.planPrograms.map((p: { program: { id: string; name: string } }) => ({
					programId: p.program.id,
					programName: p.program.name,
				}))
				: [];

			plans.push({
				planName: plan.name,
				packageId: pkg.id,
				familyLimit: plan.familyMemberLimit,
				price: pricing.price,
				includedPrograms: programs,
				startDate: pkg.startDate || pkg.created,
				status: pkg.status,
			});
		}
	} catch (error) {
		console.error("Error getting member plans:", error);
	}

	return `Here are the member plans in json format: ${JSON.stringify(plans)}`;
}
