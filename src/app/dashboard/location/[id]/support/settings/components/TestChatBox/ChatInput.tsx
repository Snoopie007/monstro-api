'use client'
import { interpolate } from "@/libs/utils";
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
    const { messages, sessionId, setMessage, assistant, member } =
        useBotSettingContext()

    async function handleResponse(response: Response) {
        // add to messages state
        const responseData = await response.json()
        console.log(responseData);
        const interpolatedContent = interpolate(responseData.content, {
          prospect: { firstName: member?.firstName },
          location
      });
        setMessage(prev => [...prev, {
            id: nanoid(),
            role: 'assistant',
            content: interpolatedContent || 'Sorry, I didn\'t receive a proper response.',
            isLoading: false,
            timestamp: new Date().getTime(),
        }])
        setIsLoading(false)
    }

    async function sendMessage(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!assistant || !input.trim()) return


        const userMessage: TestChatMessage = {
            id: nanoid(),
            role: 'human',
            content: input.trim(),
            isLoading: false,
            timestamp: new Date().getTime(),
        }

        setMessage([...messages, userMessage])
        setInput('')
        setIsLoading(true)

        try {
            // Call the new monstro-api test chat endpoint
            const apiUrl =
                process.env.NEXT_PUBLIC_MONSTRO_API_URL ||
                'http://localhost:3001'
            const response = await fetch(
                `${apiUrl}/api/protected/locations/${lid}/support/test-chat`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session?.user.sbToken || ''}`,
                    },
                    body: JSON.stringify({
                        sessionId,
                        lid,
                        // contact: {},
                        // messages: [...messages, userMessage],
                        message: input.trim(),
                        testMemberId: member?.id,
                    }),
                }
            )

            if (!response.ok) {
                throw new Error('Failed to send message')
            }

            await handleResponse(response)
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
                            disabled={isLoading}
                        >
                            <span>{isLoading ? 'Sending...' : 'Send'}</span>
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    )
}
