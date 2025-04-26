
import BotFlow from './BotBuilder';
import { BotSettings } from './components';
import { AIBot } from '@/types';
import { db } from '@/db/db';
import { AIBotProvider } from './providers/AIBotProvider';
import { ReactFlowProvider } from '@xyflow/react';
import { Integration } from '@/types';

import Error from './error';
import { decodeId } from '@/libs/server/sqids';

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

async function fetchIntegrations(id: string): Promise<Integration[] | undefined> {
    const lid = decodeId(id);
    try {
        const integrations = await db.query.integrations.findMany({
            where: (integrations, { eq }) => (eq(integrations.locationId, lid))
        });
        return integrations;
    } catch (error) {
        console.error(error);
    }
}

export default async function BotBuilder(props: { params: Promise<{ id: string, bid: number }> }) {
    const params = await props.params;
    const bot = await fetchBot(params.bid);
    const integrations = await fetchIntegrations(params.id);

    if (!bot) return <Error />

    return (
        <div className='w-screen h-screen relative  '>
            <AIBotProvider integrations={integrations} bot={bot}>
                <ReactFlowProvider>
                    <BotSettings bot={bot} lid={params.id} />
                    <div className='h-full w-full bg-gray-100'>
                        <BotFlow />
                    </div>
                </ReactFlowProvider>
            </AIBotProvider>

        </div >
    )
}
