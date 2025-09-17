import { db } from "@/db/db";
import { BotSettings, TestChatBox } from "./components";
import { notFound } from "next/navigation.js";
import { BotSettingProvider } from "./provider";

async function getAssistant(lid: string) {
    console.log(lid);
    try {
        const assistant = await db.query.supportAssistants.findFirst({
            where: (assistant, { eq }) => eq(assistant.locationId, lid),
            with: {
                triggers: true,
            }
        })
        return assistant;
    } catch (error) {
        console.error(error);
        return null;

    }
}

export default async function SupportBotSettingsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const assistant = await getAssistant(params.id);

    if (!assistant) {
        return notFound();
    }
    return (
        <div className='flex flex-row  h-[calc(100vh-58px)] p-2 gap-2'>
            <BotSettingProvider assistant={assistant} >

                <div className=" flex flex-row  gap-2 flex-1/3 ">
                    <BotSettings lid={params.id} />
                </div>
                <div className="flex-2/3">
                    <TestChatBox lid={params.id} />
                </div>
            </BotSettingProvider>
        </div>
    )
}
