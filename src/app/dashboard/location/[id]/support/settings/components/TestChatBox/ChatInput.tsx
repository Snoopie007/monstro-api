'use client'
import { Button } from '@/components/ui'
import { TestChatMessage } from '@/types'
import { nanoid } from 'nanoid'
import React, { FormEvent, useRef, useState } from 'react'
import { useBotSettingContext } from '../../provider'
import { useSession } from 'next-auth/react'

interface TestChatInputProps {
    lid: string
}


export function TestChatInput({ lid }: TestChatInputProps) {
    const { data: session } = useSession()
    const btnRef = useRef<HTMLButtonElement>(null)
    const [input, setInput] = useState('')
    const { messages, setMessage, assistant, member } = useBotSettingContext()
    const [isStreaming, setIsStreaming] = useState(false)


    async function handleStream(response: Response) {
        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = "";

        const newMessage: TestChatMessage = {
            id: nanoid(),
            role: "ai",
            content: '',
            timestamp: new Date().getTime(),
        };

        let hasReceivedContent = false;
        let lastUpdateTime = 0;
        const UPDATE_THROTTLE_MS = 500; // Update UI every 50ms max

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                if (line.trim() === "") continue;

                // Handle [DONE] signal
                if (line.trim() === "data: [DONE]") {
                    setIsStreaming(false)
                    continue;
                }

                // Parse data: prefixed lines
                if (line.startsWith("data: ")) {
                    try {
                        const jsonStr = line.substring(6); // Remove "data: " prefix
                        const data = JSON.parse(jsonStr);

                        console.log('Parsed stream data:', data);

                        switch (data.type) {
                            case 'text-start':
                                // Mark that we've started receiving content, but don't add message yet
                                if (!hasReceivedContent) {
                                    hasReceivedContent = true;
                                }
                                break;
                            case 'text-delta':
                                // Accumulate text deltas
                                if (hasReceivedContent && data.delta) {
                                    newMessage.content += data.delta;

                                    // Add message to chat on first delta, then update it
                                    if (newMessage.content === data.delta) {
                                        // First delta - add the message
                                        setMessage((prev) => [...prev, { ...newMessage }]);
                                    } else {
                                        // Subsequent deltas - update the last message with throttling
                                        const now = Date.now();
                                        if (now - lastUpdateTime >= UPDATE_THROTTLE_MS) {
                                            setMessage((prev) => [...prev.slice(0, -1), { ...newMessage }]);
                                            lastUpdateTime = now;
                                        }
                                    }
                                }
                                break;

                            case 'text-end':
                                // Mark stream as complete - always update UI for final state
                                setIsStreaming(false);
                                setMessage((prev) => [...prev.slice(0, -1), { ...newMessage }]);
                                lastUpdateTime = Date.now();
                                break;

                            default:
                                console.log('Unknown stream type:', data.type);
                        }
                    } catch (error) {
                        console.error('Error parsing stream data:', error, 'Line:', line);
                    }
                }
            }
        }

        // Ensure the message is marked as complete if stream ended without text-end
        if (hasReceivedContent) {
            setIsStreaming(false);
            setMessage((prev) => [...prev.slice(0, -1), { ...newMessage }]);
        }
    }

    async function sendMessage(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!assistant || !input.trim() || isStreaming || !member) return


        const newMessage: TestChatMessage = {
            id: nanoid(),
            role: 'human',
            content: input.trim(),
            timestamp: new Date().getTime(),
        }

        setMessage([...messages, newMessage])
        setInput('')
        setIsStreaming(true)

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
            setIsStreaming(false)
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
            {isStreaming && (
                <div className="flex flex-row justify-start text-muted-foreground text-sm p-2">
                    <span className="animate-pulse">Waiting for response...</span>
                </div>
            )}

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
                        disabled={isStreaming}
                    />
                    <div className=" flex flex-row gap-2 justify-end p-2">
                        <Button
                            type="submit"
                            ref={btnRef}
                            variant="foreground"
                            size="sm"
                            disabled={!member || isStreaming}
                        >
                            <span>{isStreaming ? 'Sending...' : 'Send'}</span>
                        </Button>
                    </div>
                </div>
            </form>

        </div>
    )
}
