'use client'
import { ScrollArea } from '@/components/ui'
import { MemberChatMessage } from './MemberChatMessage'
import { MemberChatInput } from './MemberChatInput'
import { PulsingStatus } from '@/components/ui/PulsingStatus'

const dummyMessages = [
    {
        id: '1',
        role: 'self',
        content: 'Hello, how are you?',
        created: new Date(),
    },
    {
        id: '2',
        role: 'member',
        content: 'I am good, thank you!',
        created: new Date(),
    },
]

export function MemberChatView() {
    return (
        <div className="bg-muted/50 rounded-lg flex-1 h-full flex flex-col min-h-0">
            <div className="flex flex-row gap-2 items-center justify-between border-b border-foreground/5 p-4 flex-shrink-0">
                <div className="flex flex-row items-center gap-2">
                    <PulsingStatus live={false} />
                    <span className="text-sm font-bold">Member Chat</span>

                </div>
            </div>

            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <ScrollArea className="flex-1 px-4">
                    <div className="space-y-8 py-4">
                        {dummyMessages
                            .sort(
                                (a, b) =>
                                    new Date(a.created).getTime() -
                                    new Date(b.created).getTime()
                            )
                            .map((message, index) => (
                                <MemberChatMessage
                                    key={index}
                                    message={message}
                                    userName={'Test Member'}
                                />
                            ))}
                    </div>
                </ScrollArea>
                <div className="flex-shrink-0 p-4">
                    <MemberChatInput />
                </div>
            </div>
        </div>
    )
}
