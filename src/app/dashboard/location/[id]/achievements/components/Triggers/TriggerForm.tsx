'use client'

import React, { useEffect, useState } from 'react';
import {
    FormField, FormItem, FormLabel, FormControl, FormMessage, Input,
    Select, SelectValue, SelectTrigger, SelectContent, SelectItem, Form
} from '@/components/forms';
import { SheetSection, Skeleton } from '@/components/ui';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { TriggerSchema } from '../../schemas';
import { AchievementTrigger, MemberPlan } from '@/types';
import { sleep, tryCatch } from '@/libs/utils';

interface TriggerFormProps {
    lid: string;
    form: UseFormReturn<z.infer<typeof TriggerSchema>>;
    triggers: AchievementTrigger[];
}

export function TriggerForm({ lid, form, triggers }: TriggerFormProps) {
    const triggerId = form.watch('triggerId');
    const [memberPlans, setMemberPlans] = useState<MemberPlan[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    async function fetchMemberPlans(signal: AbortSignal) {
        setIsLoading(true);
        if (memberPlans.length > 0) return;
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/plans`, {
                method: 'GET',
                signal,
            })
        );
        if (error || !result || !result.ok) {
            return;
        }
        const data = await result.json();
        await sleep(1000);
        setMemberPlans(data);
        setIsLoading(false);
    }

    useEffect(() => {
        if (triggerId !== '4') return;
        const control = new AbortController();
        fetchMemberPlans(control.signal);
        return () => control.abort();
    }, [triggerId]);



    return (
        <Form {...form}>
            <form>
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
                    {triggerId === '1' && (
                        <fieldset className='grid grid-cols-4 gap-2'>
                            <FormField
                                control={form.control}
                                name="timePeriod"
                                render={({ field }) => (
                                    <FormItem className='col-span-1'>
                                        <FormLabel size={'tiny'}>Time Period</FormLabel>
                                        <FormControl>
                                            <Input type='number' placeholder="Time Period" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="timePeriodUnit"
                                render={({ field }) => (
                                    <FormItem className='col-span-3'>
                                        <FormLabel size={'tiny'}>Time Period Unit</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger>

                                                    <SelectValue placeholder="Select a unit" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {['day', 'week', 'month', 'year'].map((unit) => (
                                                        <SelectItem key={unit} value={unit}>
                                                            {unit}
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
                    )}
                    {triggerId === '4' && (
                        <fieldset>
                            <FormField
                                control={form.control}
                                name="memberPlanId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel size={'tiny'}>Which Plan</FormLabel>
                                        <FormControl>
                                            {!isLoading ? (
                                                <Select onValueChange={field.onChange} value={field.value?.toString()}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a plan" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {memberPlans.map((plan) => (
                                                            <SelectItem key={plan.id} value={plan.id}>
                                                                {plan.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Skeleton className='h-10 w-full' />
                                            )}

                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </fieldset>
                    )}
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

                </SheetSection>

            </form>
        </Form>
    )
}
