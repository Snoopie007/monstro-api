import { Button, ScrollArea, Textarea } from '@/components/ui'
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
        <div className="h-full flex flex-col">
            <div className="flex flex-row gap-2 items-center justify-between border-b border-foreground/5 p-4">
                <div className="flex flex-col ">
                    <span className=" font-bold">Member Chat</span>
                    <div className="text-sm text-muted-foreground">
                        Active now
                    </div>
                </div>
            </div>

            <div className="flex flex-col h-full flex-1  overflow-hidden">
                <div className="relative h-full flex flex-col">
                    <ScrollArea className="h-full px-4">
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
                    <div>
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
                                        <>
                                            <Send size={14} />
                                            Send
                                        </>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
