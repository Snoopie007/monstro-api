"use client";
import { useState } from "react";
import { useSupport } from "../../providers/SupportProvider";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui";
import { toast } from "react-toastify";
import { Input } from "@/components/forms";


export function ChatInput({ lid }: { lid: string }) {
    const { current } = useSupport();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleSendMessage = async () => {
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
    return (
        <div>

            {/* Bot Suggestion Area - Only show if vendor has taken over and there's a suggestion */}
            {/* {isVendorTakenOver && botSuggestion && (
                <div className="flex-shrink-0 border-t bg-muted/30 p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <Lightbulb size={14} className="text-white" />
                            </div>
                        </div>
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                                <Badge
                                    variant="outline"
                                    className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                >
                                    Bot Suggestion
                                </Badge>
                            </div>
                            <div className="text-sm leading-relaxed bg-white border rounded-lg p-3">
                                {botSuggestion}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline"
                                    size="sm"
                                    onClick={handleUseSuggestion}
                                    className="gap-2"
                                >
                                    <Send size={12} />
                                    Use as Response
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setBotSuggestion(null)}
                                    className="text-muted-foreground"
                                >
                                    Dismiss
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )} */}

            <div className="flex-shrink-0 border-t bg-background p-4">
                <div className="flex gap-2">
                    <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Your message..."
                        disabled={loading}
                        className="flex-1"
                    />
                    <Button onClick={handleSendMessage} disabled={!message || loading} size="sm" className="gap-2">
                        disabled={!message || loading}
                        {loading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <>
                                <Send size={16} />
                                Send
                            </>
                        )}
                    </Button>

                </div>
            </div>
        </div >
    );
}