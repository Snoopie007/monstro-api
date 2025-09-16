"use client";
import { useState } from "react";
import { useSupport } from "../../providers/SupportProvider";
import { Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import { toast } from "react-toastify";
import { Textarea } from "@/components/forms";


export function ChatInput({ lid }: { lid: string }) {
    const { current } = useSupport();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    async function handleSendMessage() {
        if (!message || loading || !current) return;

        if (current.isVendorActive) {
            return toast.error("Please take over the conversation first.");

        }

        const messageContent = message.trim();
        setMessage("");
        setLoading(true);

        try {
            const response = await fetch(`/api/protected/loc/${lid}/support/conversations/${current.id}/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    content: messageContent,
                    role: "staff",
                }),
            });

            const data = await response.json();

        } catch (error) {
            console.error("Failed to send message:", error);
            // Re-add the message to input on error
            setMessage(messageContent);
        } finally {
            setLoading(false);
        }
    };


    async function handleUseSuggestion() {
        //Suggestion Logic
    }

    async function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            await handleSendMessage();
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
                        disabled={loading}
                        className="border-none resize-none p-4 focus-visible:ring-0 focus-visible:outline-hidden"
                        style={{ minHeight: '80px', maxHeight: '250px' }}
                    />
                    <div className="px-2 justify-end flex gap-2">
                        <Button variant="outline"
                            size="sm"
                            onClick={handleUseSuggestion}
                            className="gap-2"
                        >
                            <Sparkles size={14} className="text-muted-foreground" />
                            AI Suggest
                        </Button>
                        <Button onClick={handleSendMessage} disabled={!message || loading} size="sm" className="gap-1">
                            {loading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <>
                                    <Send size={14} />
                                    Send
                                </>
                            )}
                        </Button>
                    </div>

                </div>
            </div>
        </div >
    );
}