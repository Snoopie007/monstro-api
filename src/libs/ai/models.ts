// TODO: Uncomment imports when you want to enable other providers
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';

export type AIModelType = 'gpt' | 'anthropic' | 'gemini';


// 	async getMembershipSummary(memberId: string, locationId: string): Promise<string> {
// 		if (!this.context) {
// 			await this.buildContext(memberId, locationId);
// 		}
// 		try {

// 			let summary = `${this.context?.member?.firstName} ${this.context?.member?.lastName || ''}`;
// 			summary += `\n• Member since: ${this.context?.member?.created.toLocaleDateString()}`;
// 			summary += `\n• Location: ${this.context?.location?.name}`;

// 			// if (context.member?.subscriptions && context.member?.subscriptions.length > 0) {
// 			//   summary += `\n• Active subscriptions: ${context.subscriptions.length}`;
// 			// }

// 			// if (context.packages && context.packages.length > 0) {
// 			//   summary += `\n• Available packages: ${context.packages.length}`;
// 			// }

// 			return summary;
// 		} catch (error) {
// 			console.error('Error getting membership summary:', error);
// 			return 'Unable to retrieve membership summary';
// 		}
// 	}


export function getAIModel(modelType: AIModelType): BaseLanguageModel {
	switch (modelType) {
		case 'gpt':
			if (!process.env.OPENAI_API_KEY) {
				throw new Error('OPENAI_API_KEY is not set');
			}
			return new ChatOpenAI({
				modelName: 'gpt-4',
				apiKey: process.env.OPENAI_API_KEY,
			});
		case 'anthropic':
			if (!process.env.ANTHROPIC_API_KEY) {
				throw new Error('ANTHROPIC_API_KEY is not set');
			}
			return new ChatAnthropic({
				modelName: 'claude-3-sonnet-20240229',
				apiKey: process.env.ANTHROPIC_API_KEY,
			});
		case 'gemini':
			if (!process.env.GOOGLE_AI_API_KEY) {
				throw new Error('GOOGLE_AI_API_KEY is not set');
			}
			return new ChatGoogleGenerativeAI({
				model: 'gemini-pro',
				apiKey: process.env.GOOGLE_AI_API_KEY,
			});
		default:
			return new ChatOpenAI({
				modelName: 'gpt-4',
				apiKey: process.env.OPENAI_API_KEY,
			});
	}
}

export function modelInfos(modelType: AIModelType) {
	switch (modelType) {
		case 'gpt':
			return {
				provider: 'OpenAI',
				model: 'GPT-4',
				contextWindow: 128000,
				maxTokens: 4096,
				supportsStreaming: false,
				supportsFunctionCalling: true,
				costPer1kTokens: { input: 0.03, output: 0.06 }
			};
		case 'anthropic':
			return {
				provider: 'Anthropic',
				model: 'Claude 3 Sonnet',
				contextWindow: 200000,
				maxTokens: 4096,
				supportsStreaming: false,
				supportsFunctionCalling: true,
				costPer1kTokens: { input: 0.003, output: 0.015 }
			};
		case 'gemini':
			return {
				provider: 'Google',
				model: 'Gemini Pro',
				contextWindow: 30720,
				maxTokens: 2048,
				supportsStreaming: false,
				supportsFunctionCalling: true,
				costPer1kTokens: { input: 0.0005, output: 0.0015 }
			};
		default:
			return {
				provider: 'OpenAI',
				model: 'GPT-4',
				contextWindow: 128000,
				maxTokens: 4096,
				supportsStreaming: false,
				supportsFunctionCalling: true,
				costPer1kTokens: { input: 0.03, output: 0.06 }
			};
	}
}