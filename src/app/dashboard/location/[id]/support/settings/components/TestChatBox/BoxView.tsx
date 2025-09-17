"use client";
import { interpolate, tryCatch } from "@/libs/utils";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { Brush, Loader2, BrushCleaning } from "lucide-react";
import { TestChatMessages, TestChatInput } from "."
import { useBotSettingContext } from "../../provider";
import { MemberSelect } from "./MemberSelect";




export function TestChatBox({ lid }: { lid: string }) {
    const { assistant } = useBotSettingContext();
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (!assistant?.initialMessage) return;

        setInitialMessage();

    }, [assistant?.id]);


    function setInitialMessage() {
        if (!assistant?.initialMessage) return;

        const content = interpolate(assistant.initialMessage, {
            prospect: { firstName: "John" },
            bot: { name: "Mary" },
            location
        });

        // setMessages((prev: StreamSupportMessage[]) => {
        //     const initialMsg = {
        //         id: 'initial',
        //         role: 'ai',
        //         content,
        //         isLoading: false,
        //         created: new Date()
        //     }
        //     return [initialMsg, ...prev];
        // });
    }
    async function resetChat() {
        if (!assistant) return;

        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/support/chat/${assistant.id}`, {
                method: "PUT",
                body: JSON.stringify({ assistantId: assistant.id })
            })
        )
        setLoading(false);
        if (error || !result || !result.ok) {
            console.error(error);
        }

        // resetMessage();
        setInitialMessage();
    }



    return (
        <div className="flex flex-col h-full bg-foreground/5  rounded-lg">
            <div className="flex flex-row items-center justify-between flex-initial  px-4 h-[50px]">

                <div className=" font-medium">
                    Test Your Support Bot
                </div>
                <div className="flex flex-row gap-2">
                    <MemberSelect lid={lid} />
                    <Button variant={'ghost'} size={'icon'} className='size-6 hover:bg-foreground/10'
                        onClick={resetChat}
                    >

                        {loading ? <Loader2 size="14" className="animate-spin" /> : <BrushCleaning size="14" />}
                    </Button>

                </div>
            </div>
            <TestChatMessages />
            <TestChatInput lid={lid} />
        </div>

    );
}

