'use client'
import { Button } from '@/components/ui'
import { TestChatMessage } from '@/types'
import { nanoid } from 'nanoid'
import React, { FormEvent, useRef, useState } from 'react'
import { useBotSettingContext } from '../../provider'
import { useSession } from 'next-auth/react'

export function TestChatInput({ lid }: { lid: string }) {
    const { data: session } = useSession()
    const btnRef = useRef<HTMLButtonElement>(null)
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const { messages, setMessage, assistant, member } = useBotSettingContext()

    async function handleStream(response: Response) {
        console.log('handleStream')
        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = "";

        const newMessage: TestChatMessage = {
            id: nanoid(),
            role: "ai",
            content: '',
            isLoading: true,
            timestamp: new Date().getTime(),
        };


        let hasReceivedContent = false;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split("\n");
            buffer = chunks.pop() || "";

            for (const chunk of chunks) {
                if (chunk.trim() === "") continue;

                const content = chunk.split(':')[1]?.replace(/^"|"$/g, '');

                // First valid content chunk received
                if (!hasReceivedContent) {
                    hasReceivedContent = true;
                    setMessage((prev) => [...prev, { ...newMessage, isLoading: true }]);
                } else {
                    console.log(content)
                    newMessage.content += content;
                    setMessage((prev) => [...prev.slice(0, -1), { ...newMessage, isLoading: false }]);
                }

            }
        }
        setIsLoading(false);
    }

    async function sendMessage(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!assistant || !input.trim() || isLoading || !member) return


        const newMessage: TestChatMessage = {
            id: nanoid(),
            role: 'human',
            content: input.trim(),
            isLoading: false,
            timestamp: new Date().getTime(),
        }

        setMessage([...messages, newMessage])
        setInput('')
        setIsLoading(true)

        try {
            const api = process.env.NEXT_PUBLIC_MONSTRO_API_URL || 'http://localhost:3001'
            const response = await fetch(`${api}/api/protected/locations/${lid}/support/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.user.sbToken || ''}`,
                },
                body: JSON.stringify({
                    message: newMessage,
                    memberId: member?.id,
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to send message')
            }

            await handleStream(response)
        } catch (error) {
            console.error('Error sending message:', error)
            setIsLoading(false)
        }
    }

    const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            btnRef.current?.click()
        }
    }

    return (
        <div className="flex-initial w-full p-2 ">
            <form
                onSubmit={sendMessage}
                className="w-full bg-background rounded-lg"
            >
                <div className="relative">
                    <textarea
                        value={input}
                        onKeyUp={handleKeyUp}
                        placeholder="Type your message here..."
                        onChange={(e) => setInput(e.target.value)}
                        className="w-full  resize-none  focus-visible:outline-none p-4"
                        disabled={isLoading}
                    />
                    <div className=" flex flex-row gap-2 justify-end p-2">
                        <Button
                            type="submit"
                            ref={btnRef}
                            variant="foreground"
                            size="sm"
                            disabled={isLoading || !member}
                        >
                            <span>{isLoading ? 'Sending...' : 'Send'}</span>
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    )
}
