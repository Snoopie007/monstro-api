"use client"
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AIBotSchema } from "../../components/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { BotFields } from "../../components/BotFields";
import { Button, Skeleton } from "@/components/ui";
import { cn } from "@/libs/utils";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { tryCatch } from "@/libs/utils";
import { toast } from "react-toastify";
import { useRouter, useSearchParams } from "next/navigation";
import { useBot } from "@/hooks";

interface UpdateBotProps {
    lid: string;
    bid: number;
}


export function UpdateBot({ lid, bid }: UpdateBotProps) {
    const { bot, mutate, isLoading } = useBot(lid, bid);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const from = searchParams.get("from");

    const form = useForm<z.infer<typeof AIBotSchema>>({
        resolver: zodResolver(AIBotSchema),
        defaultValues: {
            title: "",
            botName: "",
            description: "",
            initialMessage: "",
            reason: "",
            responseDetails: "",
            personality: [],
            model: "",
            temperature: 0.5,
            maxTokens: 1000,

        },
        mode: "onChange"
    });

    useEffect(() => {
        if (bot) {
            form.reset(bot)
        }
    }, [bot])

    async function save(v: z.infer<typeof AIBotSchema>) {
        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/locations/${lid}/bots/${bid}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(v),
            })
        );
        setLoading(false);
        if (error || !result || !result.ok) {
            toast.error("Error updating bot")
            return;
        }
        toast.success("Bot updated")

        const url = from === "builder" ? `/builder/${lid}/bot/${bid}` : `/dashboard/locations/profile/${lid}/ai/`
        router.push(url)
    }

    return (
        <div className="flex flex-col ">
            {isLoading && (
                <div className="flex justify-center items-center h-full">
                    <Skeleton className="w-full h-40" />
                </div>
            )}
            {!isLoading && bot && <BotFields form={form} bot={bot} />}
            <div className="flex absolute top-0 left-0 bg-background shadow-xs py-2 shadow-t-none w-full justify-end">
                <div className="max-w-2xl mx-auto w-full flex justify-between">
                    <div className="flex flex-col gap-1">

                        <h2 className="font-bold text-base leading-none">Update Bot</h2>
                        <p className="text-sm text-muted-foreground">
                            Update the bot with new information about what you want it to do and about your business.
                        </p>
                    </div>
                    <div>
                        <Button variant="foreground" type="submit"
                            disabled={loading || !form.formState.isValid}
                            className={cn("children:hidden", loading && "children:block")}
                            onClick={form.handleSubmit(save)}>

                            <Loader2 className="animate-spin mr-2" />
                            Update
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

