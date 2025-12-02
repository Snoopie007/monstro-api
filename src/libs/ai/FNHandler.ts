
import { db } from '@/db/db';
import { eq } from 'drizzle-orm';
import { supportConversations } from '@/db/schemas';
import type { SupportConversation } from '@/types';
import type { MemberLocation } from '@/types/member';
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
			with: {
				plan: {
					with: {
						planPrograms: {
							with: {
								program: true,
							},
						},
					},
				},
			},
		});
		const pkgs = await db.query.memberPackages.findMany({
			where: (pkgs, { eq }) => eq(pkgs.memberId, ml.memberId),
			with: {
				plan: {
					with: {
						planPrograms: {
							with: {
								program: true,
							},
						},
					},
				},
			},
		});

		for (const sub of subs) {
			const programs = sub.plan.planPrograms.map(p => ({ programId: p.program.id, programName: p.program.name }));
			plans.push({
				planName: sub.plan.name,
				subscriptionId: sub.id,
				familyLimit: sub.plan.familyMemberLimit,
				price: sub.plan.price,
				interval: sub.plan.interval,
				intervalThreshold: sub.plan.intervalThreshold,
				includedPrograms: programs,
				startDate: sub.startDate || sub.created,
				status: sub.status,
			});
		}
		for (const pkg of pkgs) {
			const programs = pkg.plan.planPrograms.map(p => ({ programId: p.program.id, programName: p.program.name }));
			plans.push({
				planName: pkg.plan.name,
				packageId: pkg.id,
				familyLimit: pkg.plan.familyMemberLimit,
				price: pkg.plan.price,
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
