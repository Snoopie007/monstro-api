'use client'
import { useState } from 'react'
import { useSupport } from '../../providers/SupportProvider'
import { Hand, Loader2, Send, Bot } from 'lucide-react'
import { Button } from '@/components/ui'
import { toast } from 'react-toastify'
import { Textarea } from '@/components/forms'
import { useAccountStatus } from '../../../providers'

export function ChatInput({ lid }: { lid: string }) {
    const { current, updateConversation } = useSupport()
    const [loading, setLoading] = useState(false)
    const [isTakingOver, setIsTakingOver] = useState(false)
    const { locationState } = useAccountStatus()
    const isFreePlan = locationState?.planId === 1;
    const [message, setMessage] = useState('')

    async function handleSendMessage() {
        if (!message || loading || !current) return

        if (!current.isVendorActive) {
            return toast.error('Please take over the conversation first.')
        }

        const messageContent = message.trim()
        setMessage('')
        setLoading(true)

        try {
            const response = await fetch(
                `/api/protected/loc/${lid}/support/conversations/${current.id}/messages`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        content: messageContent,
                        role: 'staff',
                    }),
                }
            )

            const data = await response.json()
        } catch (error) {
            console.error('Failed to send message:', error)
            // Re-add the message to input on error
            setMessage(messageContent)
        } finally {
            setLoading(false)
        }
    }

    async function handleTakeOverConversation() {
        if (!current) return
        setIsTakingOver(true)

        try {
            const response = await fetch(
                `/api/protected/loc/${lid}/support/conversations/${current.id}/takeover`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        reason: 'Manual takeover by support agent',
                        urgency: 'medium',
                    }),
                }
            )

            if (response.ok) {
                const data = await response.json()
                // Update conversation state
                updateConversation(current.id, { isVendorActive: true })
                // Show success toast
                toast.success('Successfully took over the conversation')
            } else {
                const errorData = await response.json()
                throw new Error(
                    errorData.error || 'Failed to take over conversation'
                )
            }
        } catch (error) {
            console.error('Failed to take over conversation:', error)
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Failed to take over conversation'
            toast.error(errorMessage)
        } finally {
            setIsTakingOver(false)
        }
    }

    async function handleHandBackToBot() {
        if (!current) return
        setIsTakingOver(true)
        try {
            const response = await fetch(
                `/api/protected/loc/${lid}/support/conversations/${current.id}/takeover`,
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            )

            if (response.ok) {
                const data = await response.json()
                // Update conversation state
                updateConversation(current.id, { isVendorActive: false })
                // Show success toast
                toast.success('Successfully handed conversation back to bot')
            } else {
                const errorData = await response.json()
                throw new Error(
                    errorData.error || 'Failed to hand back conversation'
                )
            }
        } catch (error) {
            console.error('Failed to hand back to bot:', error)
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Failed to hand back conversation'
            toast.error(errorMessage)
        } finally {
            setIsTakingOver(false)
        }
    }

    // async function handleUseSuggestion() {
    //     //Suggestion Logic
    // }

    async function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault()
            await handleSendMessage()
        }
    }

    return (
        <div>
            <div className="flex-shrink-0 p-4">
                <div className="flex gap-2 bg-background rounded-lg overflow-hidden flex-col pb-2">
                    <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Your message... (Ctrl+Enter to send)"
                        disabled={loading || (isFreePlan && !current?.isVendorActive)}
                        className="border-none resize-none p-4 focus-visible:ring-0 focus-visible:outline-hidden"
                        style={{ minHeight: '80px', maxHeight: '250px' }}
                    />
                    <div className="px-2 justify-end flex gap-2">
                        {/* <Button variant="outline"
                            size="sm"
                            onClick={handleUseSuggestion}
                            className="gap-2"
                        >
                            <Sparkles size={14} className="text-muted-foreground" />
                            AI Suggest
                        </Button> */}
                        {current?.isVendorActive && !isFreePlan && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleHandBackToBot}
                                className="gap-2"
                                disabled={isTakingOver}
                            >
                                    {
                                        isTakingOver ? (
                                            <Loader2
                                                size={16}
                                                className="animate-spin"
                                            />
                                        ) : (
                                            <>
                                                <Bot
                                                    size={14}
                                                    className="text-muted-foreground"
                                                />
                                                Hand Back to Bot
                                            </>
                                        )
                                    }
                            </Button>
                        )}
                        {current?.isVendorActive && (
                            <Button
                                onClick={handleSendMessage}
                                variant="foreground"
                                disabled={!message || loading}
                                size="sm"
                                className="gap-1"
                            >
                                {loading ? (
                                    <Loader2
                                        size={16}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <>
                                        <Send size={14} />
                                        Send
                                    </>
                                )}
                            </Button>
                        )}
                        {!current?.isVendorActive && !isFreePlan && (
                            <Button
                                onClick={handleTakeOverConversation}
                                variant="foreground"
                                size="sm"
                                className="gap-1"
                                disabled={isTakingOver}
                            >
                                {isTakingOver ? (
                                    <Loader2
                                        size={16}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <>
                                        <Hand size={14} />
                                        Take over
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
