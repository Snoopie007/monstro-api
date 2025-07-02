'use client'

import React from 'react';
import {
    FormField, FormItem, FormLabel, FormControl, FormMessage, Input,
    Select, SelectValue, SelectTrigger, SelectContent, SelectItem, Form
} from '@/components/forms';
import { SheetSection } from '@/components/ui';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { TriggerSchema } from '../../schemas';
import { AchievementTrigger } from '@/types';

interface TriggerFormProps {
    form: UseFormReturn<z.infer<typeof TriggerSchema>>;
    triggers: AchievementTrigger[];
}

export function TriggerForm({ form, triggers }: TriggerFormProps) {



    const triggerId = form.watch('triggerId');

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

            </form>
        </Form>
    )
}
