import { LangChainAdapter } from 'ai';

import { ChatOpenAI } from "@langchain/openai";
import { NextRequest, NextResponse } from "next/server";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { UpstashRedisChatMessageHistory } from "@langchain/community/stores/message/upstash_redis";
import {
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    MessagesPlaceholder,
    SystemMessagePromptTemplate,
} from "@langchain/core/prompts";

import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { db } from '@/db/db';
import { getRedisClient } from '@/libs/server/redis';
import { IntegrationNodeOptions, NodeSettings, RetrievalNodeOptions } from '@/types';
import { type HierarchyNode, stratify } from 'd3-hierarchy';
import {
    chunkedStream, evaluateCondition,
    analyzeConversation, ResponsePrompt, extractVariables,
    BotError,
    getRetrievalData,
    calculateAICost
} from '@/libs/server/ai';

import { VendorGHL } from '@/libs/server/ghl';
import { Integration } from '@/types';
import { interpolate } from '@/libs/utils';
import { chargeWallet } from '@/libs/server/db';

type ChatDataType = {
    messages: ChatCompletionMessageParam[],
    data: { botId: number, sessionId: number, locationId: number }
}

type ChatBotTracker = {
    currentNode: string,
    stopped: boolean,
    stoppedReason: string,
    completedNodes: string[]
    attempts: number,
    metadata: Record<string, any>
}


type SessionContext = {
    sessionId: string,
    cost: number,
    botId: number,
    data: Record<string, any>,
    history: string[]
}


const TTL = 60 * 60 * 1

const redis = getRedisClient();

const fakeData = {
    prospect: {
        id: "ZqIesg0ZuRs0SDQlreVJ",
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@gmail.com",
        phone: "1234567890",
    },
    user: {
        firstName: "Jane",
        lastName: "Doe",
    }
}



export async function POST(req: NextRequest) {
    const rawData = await req.json()
    const { messages, data }: ChatDataType = rawData;

    if (messages.length === 0 || !data.botId || !data.sessionId || !data.locationId) {
        return NextResponse.json({ message: "Invalid Request" }, { status: 500 })
    }

    const location = await db.query.locations.findFirst({
        where: (locations, { eq }) => eq(locations.id, data.locationId),
        with: {
            integrations: true,
            wallet: true,
            bots: {
                where: (bots, { eq }) => eq(bots.id, data.botId)
            }
        }
    });

    if (!location) {
        return NextResponse.json({ message: "Location Not Found" }, { status: 500 })
    }


    const bot = location.bots[0];

    const objectives = stratify<NodeSettings>()(bot.objectives!);
    let tracker: ChatBotTracker | null = await redis.json.get(`tracker:${data.botId}`);

    if (!tracker) {
        tracker = {
            currentNode: 'start',
            stopped: false,
            stoppedReason: "",
            completedNodes: [],
            attempts: 0,
            metadata: {
                ...fakeData
            }
        }
    }


    const SessionContext = {
        sessionId: `conversation:${bot.id}`,
        cost: 0,
        botId: bot.id,
        data: {
            location: location,
            bot: { id: bot.id, name: bot.botName }
        },
        history: messages.map((m) => { return `${m.role}: ${m.content}` }),
    }


    const message = messages[messages.length - 1];

    const currentNode = objectives.find((objective) => objective.data.id === tracker.currentNode);
    if (!currentNode) { throw new Error("Invalid Objective") }

    try {
        const nextNode = await traverse(currentNode, tracker, SessionContext);

        /* Increment Attempts */
        tracker.attempts += 1;

        const model = new ChatOpenAI({
            modelName: "gpt-4o-mini",
            temperature: 0,
            maxTokens: 150,
            maxRetries: 3,
            callbacks: [
                {
                    handleLLMEnd: async (output) => {
                        const cost = calculateAICost(output.llmOutput?.tokenUsage, "gpt-4o-mini");

                        SessionContext.cost += cost;
                        await chargeWallet(location, SessionContext.cost, `AI Response gpt-4o-mini`);
                    }
                }
            ]
        });

        let options = nextNode.data.type === "ai" ? nextNode.data.options?.ai : nextNode.data.options?.retrieval;
        if (!options) { throw new Error("Invalid Objective Options") }

        let retrievalData: string = "";
        if (nextNode.data.type === "retrieval") {
            const integrations = location.integrations;
            retrievalData = await getRetrievalData(tracker, options as RetrievalNodeOptions, integrations);
        }

        const responsePrompt = await ResponsePrompt({
            ...tracker.metadata,
            ...SessionContext.data
        }, options, retrievalData, bot, location.about);

        const chain = ChatPromptTemplate.fromMessages([
            SystemMessagePromptTemplate.fromTemplate(responsePrompt),
            new MessagesPlaceholder(`history`),
            HumanMessagePromptTemplate.fromTemplate("{input}")
        ]);

        const chainWithModel = chain.pipe(model);

        const chainWithHistory = new RunnableWithMessageHistory({
            runnable: chainWithModel,
            getMessageHistory: (sessionId) => {
                return new UpstashRedisChatMessageHistory({
                    sessionId,
                    client: redis,
                    sessionTTL: TTL,
                });
            },
            inputMessagesKey: "input",
            historyMessagesKey: "history",
        })


        const stream = await chainWithHistory.stream({ input: message.content }, {
            configurable: {
                sessionId: `conversation:${bot.id}`,
            },
        });


        await Promise.all([
            redis.json.set(`tracker:${bot.id}`, '$', tracker),
            redis.expire(`tracker:${bot.id}`, TTL)
        ])

        return LangChainAdapter.toDataStreamResponse(stream);
    } catch (error) {
        if (error instanceof BotError) {
            console.log("BOT Error:", error.message, error.code);
            await Promise.all([
                redis.json.set(`tracker:${bot.id}`, '$', {
                    ...tracker,
                    stopped: true,
                    stoppedReason: error.message
                }),
                redis.expire(`tracker:${bot.id}`, TTL)
            ]);

            if (SessionContext.cost > 0) {
                await chargeWallet(location, SessionContext.cost, `AI Bot`);
            }

            const stream = chunkedStream(
                `<p class="text-red-500">Uh oh looks like the bot ended. Here is why: ${error.message}</p>`
            );

            return LangChainAdapter.toDataStreamResponse(stream);
        } else {
            console.log(error);
            return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
        }

    }
}



function nextNode(tracker: ChatBotTracker, currentObjective: HierarchyNode<NodeSettings>): HierarchyNode<NodeSettings> {
    tracker.completedNodes.push(tracker.currentNode);
    tracker.attempts = 0;
    if (currentObjective.children) {
        /* Move to Next Goal */
        const nextObjective = currentObjective.children[0]
        tracker.currentNode = nextObjective.data.id;
        return nextObjective;
    }
    throw new BotError("No Next Objective.", 500)
}


async function traverse(
    currentNode: HierarchyNode<NodeSettings>,
    tracker: ChatBotTracker,
    session: SessionContext
): Promise<HierarchyNode<NodeSettings>> {

    if (currentNode.data.type === "start") {
        return await traverse(nextNode(tracker, currentNode)!, tracker, session)
    }

    const nodeOptions = currentNode.data.options;
    let analysis;
    console.log(currentNode.data.type)
    switch (currentNode.data.type) {
        case "end":
            throw new BotError("End", 200)
        case "ai":
        case "retrieval":
            /* If State is Good Continue with the Chat */
            const options = currentNode.data.type === "ai" ? nodeOptions?.ai : nodeOptions?.retrieval;

            if (!options) {
                throw new Error("Invalid Objective Options")
            }

            const interpolatedGoal = interpolate(options.goal, {
                ...tracker.metadata,
                ...session.data
            });

            let log = {
                nodeId: currentNode.data.id,
                type: currentNode.data.type,
                state: {
                    objective: interpolatedGoal,
                    attempts: tracker.attempts,
                }
            }

            analysis = await analyzeConversation({
                msgs: session.history,
                goal: interpolatedGoal,
                instructions: options.instructions
            });


            session.cost += analysis.cost;

            await addLog(session.botId, {
                ...log,
                state: {
                    ...analysis.parsed,
                    objective: options.goal,
                    attempts: tracker.attempts,
                },
                metadata: {
                    ...analysis.raw.response_metadata
                }
            });

            if (analysis.parsed.rating < 40) {
                throw new BotError("Customer Anger Level Too High", 500)
            }

            if (analysis.parsed.completed || tracker.attempts >= options.maxAttempts!) {
                return await traverse(nextNode(tracker, currentNode), tracker, session)
            }

            return currentNode;


        case "condition":
            const evaluationResults: Record<string, unknown>[] = [];
            // First try to find a path where the condition evaluates to true
            let nextPath = currentNode.children?.find(path => {
                const options = path.data.options?.path;
                if (!options) throw new Error("Invalid Path Options");
                // Skip default paths without conditions
                if (options.isDefault && !options.condition) return false;

                // Evaluate the condition
                const results = evaluateCondition(tracker.metadata.variables, options.condition!);

                // Log the evaluation
                evaluationResults.push({
                    id: path.data.id,
                    path: path.data.node.label,
                    condition: options.condition,
                    results
                });

                return results;
            });

            // If no matching path found, use the default path
            if (!nextPath) {
                nextPath = currentNode.children?.find(path =>
                    path.data.options?.path?.isDefault
                );

                // Log the default path selection
                evaluationResults.push({
                    id: nextPath?.data.id,
                    path: nextPath?.data.node.label,
                    condition: undefined,
                    results: true
                });
            }


            await addLog(session.botId, {
                nodeId: currentNode.data.id,
                type: "condition",
                condition: {
                    nextPath: nextPath?.data.id,
                    results: evaluationResults
                },
            });

            return await traverse(nextNode(tracker, nextPath!), tracker, session)
        case "extraction":

            if (!nodeOptions?.extraction) {
                throw new Error("Invalid Extraction Options")
            }

            const formatedVariables = nodeOptions.extraction.variables.map((variable) => {
                return {
                    ...variable,
                    description: interpolate(variable.description, tracker.metadata)
                }
            })
            const { parsed, cost } = await extractVariables(formatedVariables, session.history);
            tracker.metadata.variables = {
                ...tracker.metadata?.variables,
                ...parsed
            };

            session.cost += cost;
            await addLog(session.botId, {
                nodeId: currentNode.data.id,
                type: "extraction",
                variables: parsed
            });

            return await traverse(nextNode(tracker, currentNode), tracker, session)
        case "integration":
            if (!nodeOptions?.integration) {
                throw new Error("Invalid Integration Options")
            }

            await addLog(session.botId, {
                nodeId: currentNode.data.id,
                type: "integration",
            });
            const integrations = session.data.location.integrations;
            await executeIntegration(tracker.metadata, nodeOptions.integration, integrations)
            return await traverse(nextNode(tracker, currentNode), tracker, session)
        default:
            throw new Error("Invalid Objective Type")

    }
}

async function addLog(botId: number, data: Record<string, unknown>): Promise<void> {
    await Promise.all([
        redis.lpush(`log:${botId}`, data),
        redis.expire(`log:${botId}`, TTL)
    ]);
}


async function executeIntegration(
    data: Record<string, any>,
    options: IntegrationNodeOptions,
    integrations: Integration[] | undefined
): Promise<boolean> {
    if (options.service === "ghl") {
        const integration = integrations?.find(i => i.id == options.integrationId);

        if (!integration || !integration.accessToken) { throw new Error("No GHL Integration Found") }
        const ghl = new VendorGHL();

        await ghl.getAccessToken(integration);

        switch (options.action) {
            case "addToWorkflow":
                return await ghl.addToWorkflow(options.workflowId!, data.prospect.id)
            case "addToCalendar":
                console.log(data.variables)
                if (!options?.calendarId || !data.variables.appointmentTime) { throw new Error("Invalid Calendar Options") }
                return await ghl.bookAppointment({
                    calendarId: options.calendarId!,
                    contactId: data.prospect.id,
                    locationId: integration.integrationId,
                    startTime: data.variables.appointmentTime,
                })
            default:
                throw new Error("Invalid Action")
        }
    }

    throw new Error("Invalid Integration Type")
}

