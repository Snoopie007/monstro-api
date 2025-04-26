
import { zodToJsonSchema } from "zod-to-json-schema";
import { AIMessage, HumanMessage, SystemMessage, BaseMessage, AIMessageChunk } from "@langchain/core/messages";
import { JsonOutputFunctionsParser } from "langchain/output_parsers";
import { createOpenAIFnRunnable } from "langchain/chains/openai_functions";
import { ChatPromptTemplate, HumanMessagePromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { ZodType, ZodTypeDef } from "zod";
import { Condition, RetrievalNodeOptions, Integration } from "@/types";

import { VendorGHL } from "../ghl";

async function extractConversation(
    input: string,
    messages: Array<HumanMessage | AIMessage | SystemMessage>,
    schedules: string[],
    schema: ZodType<any, ZodTypeDef, any>
): Promise<{ [key: string]: string | boolean }> {
    const fn = {
        name: "extractor",
        description: `Extract information from user input. Schedule slots: ${schedules.join(",") || ""} `,
        parameters: zodToJsonSchema(schema)
    }


    const prompt = ChatPromptTemplate.fromMessages([
        ...messages,
        HumanMessagePromptTemplate.fromTemplate("{input}")
    ])

    const outputParser = new JsonOutputFunctionsParser()
    const extractor = createOpenAIFnRunnable({
        functions: [fn],
        prompt,
        llm: new ChatOpenAI({ modelName: "gpt-3.5-turbo", temperature: 0 }),
        outputParser,
    })
    const response = await extractor.invoke({ input })

    return { ...response }
}


// Predefined comparison functions for math operations
const mathOperators: Record<string, (a: number, b: number) => boolean> = {
    ">": (a, b) => a > b,
    "<": (a, b) => a < b,
    "=": (a, b) => a === b,
    ">=": (a, b) => a >= b,
    "<=": (a, b) => a <= b,
};

// Predefined functions for string operations
const stringOperators: Record<string, (a: string, b: string) => boolean> = {
    "is": (a, b) => a === b,
    "is not": (a, b) => a !== b,
    "contains": (a, b) => b !== undefined && a.includes(b),
    "does not contain": (a, b) => b !== undefined && !a.includes(b),
    "is empty": (a) => a.trim() === "",
    "is not empty": (a) => a.trim() !== "",
    "starts with": (a, b) => b !== undefined && a.startsWith(b),
    "ends with": (a, b) => b !== undefined && a.endsWith(b),
};



// Function to evaluate a condition
function evaluateCondition(
    context: Record<string, string | number>,
    parts: Condition
): boolean {
    const { field, operator, value, type } = parts;

    if (!context.hasOwnProperty(field)) {
        throw new Error(`Variable "${field}" is not defined`);
    }

    const variable = context[field];

    // Check if value is a boolean value of true or false
    if (type === "boolean") {
        return variable === value;
    }

    if (type === "number" && mathOperators[operator]) {
        if (typeof variable !== "number") {
            throw new Error(`Variable "${field}" must be a number for operator "${operator}"`);
        }
        return mathOperators[operator](variable, Number(value));
    }


    if (type === "string" && stringOperators[operator]) {
        if (typeof variable !== "string") {
            throw new Error(`Variable "${field}" must be a string for operator "${operator}"`);
        }

        return stringOperators[operator](variable, value?.trim().replace(/^['"]|['"]$/g, ""));
    }

    throw new Error(`Unsupported operator: "${operator}"`);
}

function getChatHistory(
    firstMessage: string,
    chatHistory: { role: string, content: string }[] | null | undefined,
    followUp?: string
): BaseMessage[] {
    let messages;
    if (!chatHistory) {
        messages = [{ role: "agent", content: firstMessage }];
    } else {
        messages = chatHistory.length > 5 ? chatHistory.slice(-12) : [{ role: "agent", content: firstMessage }, ...chatHistory];
    }

    if (followUp !== "null" && followUp) {
        messages.push({ role: "agent", content: followUp })
    }

    return messages.map((msg) => {
        switch (msg.role) {
            case "user":
                return new HumanMessage(`${msg.content}`)
            default:
                return new AIMessage(`${msg.content}`);
        }
    });
}




// Custom Streaming
function customStream(message: string) {
    return new ReadableStream({
        async start(controller) {
            // Create an AIMessageChunk with the provided message
            const messageChunk = new AIMessageChunk({
                content: message,
            });

            controller.enqueue(messageChunk);
            controller.close();
        }
    });
}

// Improved streaming function that chunks the message
function chunkedStream(message: string) {
    return new ReadableStream({
        async start(controller) {
            // Split the message into smaller chunks
            const chunkSize = 10; // Characters per chunk
            const delay = 20; // Milliseconds between chunks

            for (let i = 0; i < message.length; i += chunkSize) {
                const chunk = message.substring(i, i + chunkSize);

                // Create an AIMessageChunk with just this portion of the message
                const messageChunk = new AIMessageChunk({
                    content: chunk,
                });

                controller.enqueue(messageChunk);

                // Add a small delay between chunks to simulate typing
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            controller.close();
        }
    });
}


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


async function getRetrievalData(tracker: Record<string, any>, options: RetrievalNodeOptions, integrations: Integration[]) {

    switch (options.knowledgeBase) {
        case 'website':
            break;
        case 'api':
            if (!options.api) throw new Error("Options Not Found");

            const integration = integrations.find(i => i.id == options.api?.integrationId);

            if (!integration || !integration.accessToken) { throw new Error("No Integration Found"); }

            if (options.api?.service === 'ghl') {
                const ghl = new VendorGHL();
                await ghl.getAccessToken(integration);
                switch (options.api.action) {
                    case 'getCalendarSlots':
                        if (!options.api.calendarId) { throw new Error("No Calendar ID Found"); }
                        const res = await ghl.getFreeSlots(options.api.calendarId);
                        const schedules = res.join(",  ");
                        tracker.metadata = {
                            ...tracker.metadata,
                            schedules: {
                                slots: schedules
                            }
                        }
                        return schedules;
                    default:
                        throw new Error("Invalid Action");
                }
            }
            break;
        case 'internal':
            break;
        default:
            throw new Error("Invalid Knowledge Base");
    }
}


// openai-pricing.ts

export type OpenAIModelPricing = {
    [model: string]: {
        prompt: number;      // price per 1K prompt tokens (USD)
        completion: number; // price per 1K completion tokens (USD)
        input?: number;      // used for embedding/input models
        output?: number;     // used for embedding/output models
    };
};

export const OPENAI_PRICES: OpenAIModelPricing = {
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
    const p = OPENAI_PRICES[model];
    let cost = 0;
    const margin = 2;
    if (usage && p) {
        const { promptTokens, completionTokens } = usage;
        cost = ((promptTokens * p.prompt) + (completionTokens * p.completion)) / 1000;
        cost = cost * margin;
        if (cost < 0.01) {
            cost = 1;
        } else {
            cost = Math.ceil(cost * 10000)
        }
    }
    return cost;
}

export {
    extractConversation,
    evaluateCondition,
    getChatHistory,
    customStream,
    chunkedStream,
    BotError,
    getRetrievalData,
    calculateAICost
}
