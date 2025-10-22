'use client'
import { Button, ScrollArea } from '@/components/ui'
import { Textarea } from '@/components/forms'
import { MemberChatMessage } from './MemberChatMessage'
import { Send } from 'lucide-react'

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
                    <span className=" font-bold">Member Chat</span>
                    <div className="text-sm text-muted-foreground">
                        Active now
                    </div>
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
                    <div className="flex gap-2 bg-background rounded-lg overflow-hidden flex-col pb-2">
                        <Textarea
                            placeholder="Your message... (Ctrl+Enter to send)"
                            className="border-none resize-none p-4 focus-visible:ring-0 focus-visible:outline-hidden"
                            style={{
                                minHeight: '80px',
                                maxHeight: '250px',
                            }}
                        />
                        <div className="px-2 justify-end flex gap-2">
                            <Button
                                variant="foreground"
                                size="sm"
                                className="gap-1"
                            >
                                <Send size={14} />
                                <span>Send</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
