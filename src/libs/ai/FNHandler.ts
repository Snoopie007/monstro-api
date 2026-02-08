
import { db } from '@/db/db';
import { eq } from 'drizzle-orm';
import { supportConversations } from '@subtrees/schemas';
import type { SupportConversation, MemberLocation } from '@subtrees/types';
import { broadcastSupportConversation, formatSupportConversationPayload } from '@/libs/support-broadcast';

type ToolCall = {
	id?: string;
	name: string;
	args: Record<string, any>;
	type?: 'tool_call';
}

type Context = {
	conversation: SupportConversation;
	ml: MemberLocation;
}

async function EscalateToHuman(toolCall: ToolCall, context: Context): Promise<string> {

	const { args } = toolCall;

	console.log('Escalating to human:', args);

	try {
		// Mark conversation for human takeover
		const [updatedConversation] = await db.update(supportConversations).set({
			isVendorActive: true,
			updated: new Date(),
		}).where(eq(supportConversations.id, context.conversation.id)).returning();

		if (updatedConversation) {
			// Broadcast to Supabase Realtime (for dashboard and mobile)
			try {
				await broadcastSupportConversation(
					updatedConversation.locationId,
					formatSupportConversationPayload(updatedConversation as SupportConversation),
					'conversation_updated'
				);
			} catch (broadcastError) {
				console.error('Failed to broadcast escalation:', broadcastError);
			}
		}

	} catch (error) {
		console.error('Error escalating to human:', error);
	}


	return `Respond Exactly Like this: I have notified our support team of your request. `
}


async function GetMemberPlans(toolCall: ToolCall, context: Context): Promise<string> {

	const { ml } = context;
	let plans = [];

	try {
		const subs = await db.query.memberSubscriptions.findMany({
			where: (subs, { eq }) => eq(subs.memberId, ml.memberId),
		});
		const pkgs = await db.query.memberPackages.findMany({
			where: (pkgs, { eq }) => eq(pkgs.memberId, ml.memberId),
		});

		const pricingIds = new Set<string>();
		subs.forEach(sub => pricingIds.add(sub.memberPlanPricingId));
		pkgs.forEach(pkg => pricingIds.add(pkg.memberPlanPricingId));

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

		// Helper function to safely get pricing by id
		function getPricingById(id: string) {
			return pricings.find(p => p.id === id);
		}

		// Build for subscriptions
		for (const sub of subs) {
			const pricing = getPricingById(sub.memberPlanPricingId);
			if (!pricing || !pricing.plan) {
				console.warn(`No pricing/plan found for subscription ${sub.id}`);
				continue;
			}
			const plan = pricing.plan;
			const programs = Array.isArray(plan.planPrograms)
				? plan.planPrograms.map((p: any) => ({
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

		// Build for packages
		for (const pkg of pkgs) {
			const pricing = getPricingById(pkg.memberPlanPricingId);
			if (!pricing || !pricing.plan) {
				console.warn(`No pricing/plan found for package ${pkg.id}`);
				continue;
			}
			const plan = pricing.plan;
			const programs = Array.isArray(plan.planPrograms)
				? plan.planPrograms.map((p: any) => ({
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
		console.error('Error getting member plans:', error);
	}


	return `Here are the member plans in json format: ${JSON.stringify(plans)}`
}

async function RAGTool(toolCall: ToolCall) {
	// if (toolCall.name !== "RAGTool") {
	//     throw new Error("Invalid tool.")
	// }

	// const { type, query } = toolCall.args;

	// return {
	//     message: new ToolMessage({
	//         content: data,
	//         tool_call_id: toolCall.id!,
	//         name: toolCall.name
	//     }),
	//     next
	// }
}


const ToolFunctions = {
	EscalateToHuman,
	GetMemberPlans,
}

export { ToolFunctions };
