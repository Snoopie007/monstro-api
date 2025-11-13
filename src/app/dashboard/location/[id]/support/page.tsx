import type { SupportAssistant } from '@/types'
import { db } from '@/db/db'
import { eq } from 'drizzle-orm'
import { supportAssistants } from '@/db/schemas'
import { SupportList, ChatView } from './components'
import { SupportProvider } from './providers/SupportProvider'

async function getAssistant(lid: string): Promise<SupportAssistant | null> {

    try {
        const assistant = await db.query.supportAssistants.findFirst({
            where: eq(supportAssistants.locationId, lid),
            with: {
                conversations: {
                    with: {
                        member: true,
                    },
                    orderBy: (conversations, { desc }) => [
                        desc(conversations.created),
                    ],
                },
            },
        })

        if (!assistant) {
            return null
        }

        return assistant
    } catch (error) {
        console.error('Error fetching support assistant:', error)
        return null
    }
}

export default async function SupportPage(props: {
    params: Promise<{ id: string }>
}) {
    const params = await props.params
    const assistant = await getAssistant(params.id)

    return (
        <div className="w-full h-full pb-2 pr-2">
            <SupportProvider assistant={assistant}>
                <div className="flex flex-row h-full transition-all duration-300 ease-in-out gap-2">
                    <div className="flex-none w-[25%]">
                        <SupportList lid={params.id} />
                    </div>
                    <div className="flex-1 ">
                        <div className="bg-muted/50 rounded-lg h-full">
                            <ChatView lid={params.id} />
                        </div>
                    </div>
                    <div className="flex-none w-[25%] ">
                        {/* Additional User Info */}
                    </div>
                </div>
            </SupportProvider>
        </div>
    )
}
