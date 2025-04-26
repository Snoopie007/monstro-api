'use client'
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { cn, tryCatch } from '@/libs/utils';

import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { AIBotSchema } from "../../components/schemas"
import { BotFields } from "../../components"
import { Loader2 } from "lucide-react"


interface AIBotSettingsProps {
    lid: number
}

export function NewBot({ lid }: AIBotSettingsProps) {

    const [loading, setLoading] = useState<boolean>(false);
    const { push } = useRouter();

    const form = useForm<z.infer<typeof AIBotSchema>>({
        resolver: zodResolver(AIBotSchema),
        defaultValues: {
            title: '',
            botName: '',
            description: '',
            reason: '',
            personality: [],
            initialMessage: '',
            responseDetails: '',
            maxTokens: 100,
            temperature: 0,
            model: 'gpt-4'
        },
        mode: "onChange",
    });




    async function save(v: z.infer<typeof AIBotSchema>) {
        if (loading) return
        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/locations/${lid}/bots/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(v),
            })
        );
        setLoading(false);
        if (error || !result || !result.ok) {
            toast.error("Error creating bot")
            return;
        }
        const data = await result.json();
        push(`/builder/${lid}/bot/${data.id}`)
    }

    return (
        <div className="flex flex-col ">

            <BotFields form={form} />
            <div className="flex absolute top-0 left-0 bg-background shadow-xs py-2 shadow-t-none w-full justify-end z-40">
                <div className="max-w-2xl mx-auto w-full flex justify-between">
                    <div className="flex flex-col gap-1">

                        <h2 className="font-bold text-base leading-none">Create a new bot</h2>
                        <p className="text-sm text-muted-foreground">
                            Provide the bot more information about what you want it to do and about your business.
                        </p>
                    </div>
                    <div>
                        <Button variant="foreground" type="submit"
                            disabled={loading || !form.formState.isValid}
                            className={cn("children:hidden", loading && "children:block")}
                            onClick={form.handleSubmit(save)}>

                            <Loader2 className="animate-spin mr-2" />
                            Save
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
