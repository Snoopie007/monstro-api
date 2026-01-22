import type { SupportConversation } from "@/types";
import { ToolFunctions } from "./FNHandler";
import { BaseMessage, ToolMessage, trimMessages } from "@langchain/core/messages";
import type { SupportAssistant, MemberLocation } from "@/types";
import type { ChatOpenAI } from "@langchain/openai";
import type { ChatAnthropic } from "@langchain/anthropic";
import type { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { UpstashRedisChatMessageHistory } from "@langchain/community/stores/message/upstash_redis";
import { DEFAULT_SUPPORT_TOOLS } from "./Tools";
import {
	ChatPromptTemplate,
	MessagesPlaceholder,
	SystemMessagePromptTemplate
} from "@langchain/core/prompts";

export async function* invokeTestBot(
	conversation: SupportConversation,
	assistant: SupportAssistant,
	ml: MemberLocation,
	systemPrompt: string,
	model: ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI,
	history: UpstashRedisChatMessageHistory
): AsyncGenerator<string> {


	const tools: Record<string, any>[] = [];
	DEFAULT_SUPPORT_TOOLS.forEach((tool) => {
		tools.push({
			type: "function",
			function: tool,
		});
	});



	const messages = await history.getMessages();
	const trimmed = await trimMessages(messages, {
		maxTokens: 500,
		strategy: "last",
		tokenCounter: model,
	});
	const modelWithTools = model.bindTools(tools);


	const prompt = ChatPromptTemplate.fromMessages([
		SystemMessagePromptTemplate.fromTemplate(
			systemPrompt +
			"\n\nIMPORTANT: This is a TEST CHAT session. Do not make any real changes to member data. You can view member information but avoid making modifications."
		),
		new MessagesPlaceholder(`history`),
	]);

	const modelWithPrompt = prompt.pipe(modelWithTools);

	const responses: BaseMessage[] = [];
	const res = await modelWithPrompt.invoke({ history: trimmed });

	let completed = true;
	responses.push(res);
	// If there are tool calls, we need to handle them properly
	if (res.tool_calls?.length) {
		// TEMP FIX
		let data: any | undefined = undefined;

		for (const toolCall of res.tool_calls) {
			console.log('Processing tool call:', toolCall.name);
			const tool = ToolFunctions[toolCall.name as keyof typeof ToolFunctions];

			if (toolCall.name !== 'EscalateToHuman') {
				data = await tool(toolCall, { conversation, ml });
			} else {

				data = {
					content: 'Respond Exactly Like this: I have notified our support team of your request.',
					role: 'tool',
					completed: false,
				}
			}

			if (data) {
				responses.push(new ToolMessage({
					content: data.content,
					tool_call_id: toolCall.id!,
					name: toolCall.name,
				}));
				completed = data.completed;
			}
		}
	}

	await history.addMessages(responses);

	if (!completed) {
		yield* invokeTestBot(conversation, assistant, ml, systemPrompt, model, history);
		return;
	}
	yield responses[0]?.content as string;
	return;
}



export function createMockConversation(aid: string, mid: string, lid: string): SupportConversation {

	return {
		id: aid,
		title: "New Conversation",
		metadata: {},
		locationId: lid,
		status: "open",
		supportAssistantId: aid,
		memberId: mid,
		created: new Date(),
		category: null,
		takenOverAt: null,
		updated: null,
		description: null,
		priority: 3,
		isVendorActive: false,
	}
}
