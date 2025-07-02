'use client'

import React from 'react';
import {
    FormField, FormItem, FormLabel, FormControl, FormMessage, Input,
    Select, SelectValue, SelectTrigger, SelectContent, SelectItem, Form
} from '@/components/forms';
import { Button, SheetClose, SheetFooter, SheetSection } from '@/components/ui';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { TriggerSchema } from '../schemas';
import { toast } from 'react-toastify';
import { tryCatch } from '@/libs/utils';
import { AchievementTrigger } from '@/types';
import { Loader2 } from 'lucide-react';

interface TriggerFormProps {
    lid: string;
    triggers: AchievementTrigger[];
    onFinish: () => void;
    aid: string;
}

export function TriggerForm({ lid, triggers, onFinish, aid }: TriggerFormProps) {

    const form = useForm<z.infer<typeof TriggerSchema>>({
        resolver: zodResolver(TriggerSchema),
        defaultValues: {
            triggerId: '',
            weight: 0,
            timePeriod: 0,
            timePeriodUnit: '',
            planId: '',
        },
        mode: "onChange"
    })

    const triggerId = form.watch('triggerId');

    async function onSubmit(v: z.infer<typeof TriggerSchema>) {

        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/achievements/${aid}/triggers`, {
                method: 'POST',
                body: JSON.stringify(v),
            })
        );

        if (error || !result || !result.ok) {
            toast.error("Something went wrong, please try again later");
            return;
        }
        form.reset();
        onFinish();
    }
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <SheetSection className='border-b-0'>
                    <div className='space-y-1'>

                        <p className='bg-foreground/5 p-4 rounded-sm text-sm text-muted-foreground'>
                            Triggers are used to progress the achievement. For example, the number of referrals reached 5 or 10, etc..
                        </p>
                    </div>
                    <fieldset>
                        <FormField
                            control={form.control}
                            name="triggerId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel size={'tiny'}>Type of Trigger</FormLabel>
                                    <FormControl>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a trigger" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {triggers.map((trigger) => (
                                                    <SelectItem key={trigger.id} value={trigger.id.toString()}>
                                                        {trigger.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </fieldset>
                    {['2', '3'].includes(triggerId) && (
                        <fieldset>
                            <FormField
                                control={form.control}
                                name="weight"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel size={'tiny'}>Weight</FormLabel>
                                        <FormControl>
                                            <Input type='number' placeholder="Weight" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </fieldset>
                    )}

                    {['4'].includes(triggerId) && (
                        <fieldset>
                            <FormField
                                control={form.control}
                                name="planId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel size={'tiny'}>Which Plan</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a plan" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">Plan 1</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </fieldset>
                    )}
                </SheetSection>
                <SheetFooter className='border-t border-foreground/10 py-3 px-4'>
                    <SheetClose asChild>
                        <Button variant={"outline"} size={"sm"}>
                            Cancel
                        </Button>
                    </SheetClose>
                    <Button type='submit' size={"sm"} disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? <Loader2 className='size-4 animate-spin' /> : 'Create'}
                    </Button>
                </SheetFooter>

            </form>
        </Form>
    )
}
