import BotFlow from './BotBuilder';
import { BotSettings } from './components';
import { AIBot, NodeDataType, Integration } from '@/types';
import { db } from '@/db/db';
import { AIBotProvider } from './providers/AIBotProvider';
import { Edge, Node, ReactFlowProvider } from '@xyflow/react';

import Error from './error';

async function fetchBot(bid: number): Promise<AIBot | undefined> {
    try {

        const bot = await db.query.aiBots.findFirst({
            where: (bots, { eq }) => (eq(bots.id, bid)),
        });

        return bot;
    } catch (error) {
        console.error(error);

    }
}

async function fetchIntegrations(lid: number): Promise<Integration[] | undefined> {
    try {
        const integrations = await db.query.integrations.findMany({
            where: (integrations, { eq }) => (eq(integrations.locationId, lid))
        });
        return integrations;
    } catch (error) {
        console.error(error);
    }
}

function generateEdges(objectives: Node<NodeDataType>[]) {
    let edges: Edge[] = [];
    objectives.forEach((objective) => {
        if (!objective.parentId) return;

        const newEdge: Edge = {
            id: `${objective.parentId}-${objective.id}`,
            source: objective.parentId,
            target: objective.id,
            type: "plus",
        }
        if (objective.type === "path") {
            newEdge.type = "smoothstep";
            newEdge.animated = true;
        }

        if (objective.data.groupParentId == objective.parentId) {
            newEdge.type = "lock";
        }
        edges.push(newEdge);
    });
    return edges;
}


export default async function BotBuilder(props: { params: Promise<{ lid: number, bid: number }> }) {
    const params = await props.params;
    const bot = await fetchBot(params.bid);
    const integrations = await fetchIntegrations(params.lid);

    if (!bot) return <Error />


    const initialNodes = bot.objectives?.map((o) => {
        const { parentId, ...rest } = o;
        return {
            ...rest
        }
    }) || [];
    const initialEdges = generateEdges(bot.objectives || []);

    return (
        <div className='w-screen h-screen relative  '>
            <ReactFlowProvider>
                <AIBotProvider integrations={integrations} bot={bot}>

                    <BotSettings bot={bot} lid={params.lid} />
                    <div className='h-full w-full bg-gray-100'>
                        <BotFlow initialNodes={initialNodes} initialEdges={initialEdges} />
                    </div>

                </AIBotProvider>
            </ReactFlowProvider>
        </div >
    )
}
