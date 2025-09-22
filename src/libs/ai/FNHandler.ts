import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { db } from '@/db/db';
import { eq } from 'drizzle-orm';
import { supportConversations } from '@/db/schemas';
import type { MessageRole, SupportConversation } from '@/types';
import type { MemberLocation } from '@/types/member';
import { ToolMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
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


export type ToolCallResponse = {
	content: string;
	role: MessageRole;
	completed: boolean;
}

async function EscalateToHuman(toolCall: ToolCall, context: Context): Promise<ToolCallResponse> {

	const { args } = toolCall;

	console.log('Escalating to human:', args);

	try {
		// Mark conversation for human takeover
		await db.update(supportConversations).set({
			isVendorActive: true,
		}).where(eq(supportConversations.id, context.conversation.id));

	} catch (error) {
		console.error('Error escalating to human:', error);
	}


	return {
		content: 'I have notified our support team of your request. They will be with you shortly to help with your request.',
		role: 'ai',
		completed: true,
	}
}


async function GetMemberPlans(toolCall: ToolCall, context: Context): Promise<ToolCallResponse> {

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


	return {
		content: `Here are the member plans in json format: ${JSON.stringify(plans)}`,
		role: 'tool',
		completed: false,
	}
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






// Knowledge base search tool (placeholder)
export const SearchKnowledgeBase = tool(
	async (input: any, context?: any) => {
		const { query } = input;
		const supportBotId = context?.supportBotId;

		try {
			console.log(`📚 Searching knowledge base for: "${query}" in bot: ${supportBotId}`);


			return `I searched our knowledge base for "${query}" but the knowledge base system is not yet fully configured. Let me help you with your membership details or connect you with a human agent for specific facility information.`;
		} catch (error) {
			console.error("Error searching knowledge base:", error);
			return "I encountered an error searching our knowledge base. Please contact support for assistance.";
		}
	},
	{
		name: "search_knowledge_base",
		description: "Search the knowledge base for general facility and policy information",
		schema: z.object({
			query: z.string().describe("Search query for the knowledge base"),
		}),
	}
);

const ToolFunctions = {
	EscalateToHuman,
	GetMemberPlans,
}

export { ToolFunctions };
