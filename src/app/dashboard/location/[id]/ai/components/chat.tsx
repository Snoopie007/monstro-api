"use client";
import { Message, useChat } from "ai/react";
import { cn, interpolate, tryCatch } from "@/libs/utils";
import { Dispatch, FormEvent, SetStateAction, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui";
import { AIBot } from "@/types";
import { Button } from "@/components/ui";
import { Minimize2, RefreshCcw } from "lucide-react";
import { Location } from "@/types";



interface AIChatProps {
    bot: AIBot;
    setSelectedBot: Dispatch<SetStateAction<AIBot | null>>;
    location: Location
    lid: string
}

const SessionID = Math.random().toString(36).substring(7);


export function AIChat({ bot, setSelectedBot, location, lid }: AIChatProps) {

    const { messages, input, setMessages, handleInputChange, handleSubmit } = useChat({
        api: `/api/protected/loc/${lid}/bots/chat`, onResponse: (data) => { console.log(data) }
    });

    const btnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!bot) return;
        setInitialMessage(bot);
    }, [bot]);

    function setInitialMessage(bot: AIBot) {
        const messages: Message[] = []
        if (bot.initialMessage) {
            messages.push({
                id: "intitial_message",
                role: "assistant",
                content: interpolate(bot.initialMessage, {
                    prospect: { firstName: "John" },
                    bot: { name: "Mary" },
                    location,
                })
            })
        }
        return setMessages(messages);
    }

    async function resetChat() {
        if (!bot) return;
        setInitialMessage(bot);
        const { error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/bots/${bot.id}`, {
                method: "PUT",
                body: JSON.stringify({ sessionId: SessionID })
            })
        )
        if (error) {
            console.error(error);
        }
    }

    function sendMessage(e: FormEvent<HTMLFormElement>) {
        handleSubmit(e, { data: { botId: bot.id, locationId: bot.locationId, sessionId: SessionID } });
    }

    return (
        <div className="flex flex-1 h-full flex-col relative ">
            <div className="flex flex-row items-center justify-between border-b border-foreground/10 flex-initial  px-4 h-[80px]">
                <span className="text-sm font-medium">
                    {bot ? bot.title : ""}
                </span>
                <div className="flex flex-row gap-2">
                    <Button variant={'ghost'} size={'icon'} className='size-6 hover:bg-foreground/10'
                        onClick={resetChat}
                    >
                        <RefreshCcw size="14" />
                    </Button>
                    <Button variant={'ghost'} size={'icon'} className='size-6 hover:bg-foreground/10'
                        onClick={() => {
                            setSelectedBot(null);
                        }}
                    >
                        <Minimize2 size="14" />
                    </Button>
                </div>
            </div>
            <div className="flex-1">
                <ScrollArea className="flex-1 h-[calc(100vh-235px)] overflow-hidden  relative">
                    <div className=" w-full p-4 text-base ">
                        {messages.map((m) => (
                            <MessageFormat message={m} key={m.id} />
                        ))}
                    </div>
                </ScrollArea>
            </div>
            <div className="flex-initial w-full">
                <form onSubmit={sendMessage} className="w-full">
                    <div className=" relative">
                        <textarea
                            value={input}
                            onKeyUp={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    return btnRef.current?.click();
                                }
                            }}
                            placeholder="Type your message here..."
                            onChange={handleInputChange}
                            className=" w-full min-h-[120px] resize-none border-t focus-visible:outline-none  py-4 px-4"
                        />
                        <div className="absolute right-3 bottom-5 flex flex-row gap-2">

                            <Button type="submit" ref={btnRef} variant="default" size="xs">
                                <span>Send</span>
                            </Button>
                        </div>

                    </div>
                </form>
            </div>

        </div >
    );
}

function MessageFormat({ message: { role, content } }: { message: Message }) {

    return (
        <div className={cn(`message mb-3 break-words`)}>
            <div className="flex gap-4 flex-row justify-start">
                <div className="flex-initial">
                    <div className="flex w-6 h-6 rounded-full bg-foreground"></div>
                </div>
                <div className="flex-1">
                    <span className="font-semibold leading-none">
                        {role === "user" ? "You" : "Monstro"}
                    </span>
                    <div
                        className="text-base text-foreground py-2 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: content }}
                    />
                </div>
            </div>
        </div>
    );
}
