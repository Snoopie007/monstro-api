'use client'
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useMemo, useState } from 'react'
import { BotFields } from '.';
import { z } from 'zod';
import { Button, ScrollArea, Skeleton } from '@/components/ui';
import { Loader2 } from 'lucide-react';
import { sleep, tryCatch } from '@/libs/utils';
import { toast } from 'react-toastify';
import { SupportBotSchema } from '@/libs/FormSchemas/SupportBotSchema';
import { useBotSettingContext } from '../provider';



export function BotSettings({ lid }: { lid: string }) {
    const { assistant } = useBotSettingContext();
    const [isSaving, setIsSaving] = useState(false);
    const isLoading = useMemo(() => !assistant, [assistant]);

    const form = useForm<z.infer<typeof SupportBotSchema>>({
        resolver: zodResolver(SupportBotSchema),
        defaultValues: {
            name: '',
            prompt: '',
            initialMessage: '',
            temperature: 0,
            model: assistant?.model,
            persona: assistant?.persona || {
                name: '',
                avatar: '',
                responseStyle: '',
                personality: []
            }
        },
        mode: "onChange",
    });



    async function onSubmit(v: z.infer<typeof SupportBotSchema>) {

        if (!assistant) return;
        setIsSaving(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/support/${assistant.id}`, {
                method: "PATCH",
                body: JSON.stringify(v)
            })
        );
        await sleep(1000);
        setIsSaving(false);
        if (error || !result || !result.ok) {
            toast.error(error?.message || "Something went wrong.");
            return;
        }
    }

    return (
        <div className="flex-1/2">
            <div className=' flex-1 h-full  rounded-lg bg-foreground/5'>
                {isLoading ? (
                    <div className='flex flex-col gap-4 h-full p-4'>
                        <Skeleton className='w-full h-20 rounded-lg bg-foreground/5' />
                        <Skeleton className='w-full h-10 rounded-lg bg-foreground/5' />
                        <Skeleton className='w-[80%] h-20 rounded-lg bg-foreground/5' />
                    </div>
                ) : (
                    assistant && (
                        <div className='py-4'>

                            <ScrollArea className='h-[calc(100%-110px)] w-full  '>
                                <div className='px-4'>
                                    <BotFields form={form} lid={lid} assistant={assistant} />
                                </div>
                            </ScrollArea>
                            <div className='flex flex-row justify-end px-4 py-2  '>
                                <Button variant={'foreground'} size={'sm'} className="rounded-sm"
                                    disabled={isSaving}
                                    onClick={form.handleSubmit(onSubmit)}>
                                    {isSaving ? <Loader2 className='size-4 animate-spin' /> : 'Save'}
                                </Button>
                            </div>
                        </div>
                    )
                )}
            </div>
        </div >
    )
}
