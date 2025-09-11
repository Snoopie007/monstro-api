
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import type {
	BotModel,
	SupportMessage
} from '@/types';
import { HumanMessage, ToolMessage, AIMessage, BaseMessage, SystemMessage } from "@langchain/core/messages";




// Custom error classes to distinguish between different types of errors
class BotError extends Error {
	code: number;
	log: Record<string, any>
	constructor(message: string, code: number, log?: Record<string, any>) {
		super(message);
		this.name = "BotError";
		this.code = code;
		this.log = log || { reason: "", logs: {} };
	}
}



type ModelPricing = {
	[model: string]: {
		prompt: number;      // price per 1K prompt tokens (USD)
		completion: number; // price per 1K completion tokens (USD)
		input?: number;      // used for embedding/input models
		output?: number;     // used for embedding/output models
	};
};


export const MODEL_PRICES: ModelPricing = {
	// Chat Models
	"gpt-4": { prompt: 0.03, completion: 0.06 },
	"gpt-4-32k": { prompt: 0.06, completion: 0.12 },
	"gpt-4-turbo": { prompt: 0.01, completion: 0.03 },
	"gpt-4-0125-preview": { prompt: 0.01, completion: 0.03 },
	"gpt-3.5-turbo": { prompt: 0.0015, completion: 0.002 },
	"gpt-3.5-turbo-0125": { prompt: 0.0005, completion: 0.0015 },

	// GPT-4.1 Series
	"gpt-4.1": { prompt: 0.002, completion: 0.008 },
	"gpt-4.1-mini": { prompt: 0.0004, completion: 0.0016 },
	"gpt-4.1-nano": { prompt: 0.0001, completion: 0.0004 },

	// GPT-4o Series
	"gpt-4o": { prompt: 0.0025, completion: 0.01 },
	"gpt-4o-mini": { prompt: 0.00015, completion: 0.0006 },

	// Omni Models (o-series)
	"o3": { prompt: 0.01, completion: 0.04 },
	"o3-mini": { prompt: 0.0011, completion: 0.0044 },
	"o4-mini": { prompt: 0.0011, completion: 0.0044 },
};


function calculateAICost(usage: { promptTokens: number, completionTokens: number }, model: string) {
	const p = MODEL_PRICES[model];
	let cost = 0;
	const margin = 2;
	if (usage && p) {
		const { promptTokens, completionTokens } = usage;
		cost = ((promptTokens * p.prompt) + (completionTokens * p.completion)) / 1000;
		cost = cost * margin;
		if (cost < 0.01) {
			cost = 1;
		} else {
			cost = Math.ceil(cost * 10000);
		}
	}
	return cost;
}

function getModel(model: BotModel, handleLLMEnd: (output: any) => void) {
	const baseURL = {
		gpt: 'https://oai.helicone.ai/v1',
		anthropic: 'https://anthropic.helicone.ai',
		gemini: 'https://gemini.helicone.ai/v1'
	}
	const clientOptions = {
		baseURL: baseURL[model],
		defaultHeaders: {
			"Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`
		}
	}

	switch (model) {
		case 'gpt':
			return new ChatOpenAI({
				apiKey: process.env.OPENAI_API_KEY,
				modelName: 'gpt-4o-mini',
				maxRetries: 3,
				callbacks: [{
					handleLLMEnd: handleLLMEnd
				}],
				configuration: clientOptions
			});

		case 'anthropic':
			return new ChatAnthropic({
				model: "claude-3-5-sonnet-20240620",
				temperature: 0,
				maxRetries: 3,
				callbacks: [{
					handleLLMEnd: handleLLMEnd
				}],
				clientOptions: clientOptions
			});

		case 'gemini':
			return new ChatGoogleGenerativeAI({
				model: "gemini-2.0-flash",
				temperature: 0,
				maxRetries: 3,
				callbacks: [{
					handleLLMEnd: handleLLMEnd
				}],
			})

		default:
			throw new Error('Invalid model type');
	}
}


function formatHistory(messages: SupportMessage[]) {
	let history = [];
	for (const message of messages) {
		if (['staff', 'ai'].includes(message.role)) {
			history.push(
				new AIMessage({
					content: message.content
				})
			)
		} else if (message.role === 'human') {
			history.push(
				new HumanMessage({
					content: message.content
				})
			)
		} else if (['tool', 'tool_message'].includes(message.role)) {
			history.push(
				new ToolMessage({
					content: message.content,
					tool_call_id: message.metadata.tool_call_id,
					name: message.metadata.tool_name
				})
			)
		} else if (message.role === 'tool_call') {
			history.push(
				new AIMessage({
					content: message.content,
					tool_calls: message.metadata.tool_calls
				})
			)
		} else {
			history.push(
				new SystemMessage({
					content: message.content
				})
			)
		}
	}
	return history;
}

export {
	calculateAICost,
	getModel,

	formatHistory
}