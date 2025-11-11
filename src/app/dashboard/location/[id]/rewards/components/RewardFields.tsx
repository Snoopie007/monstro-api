'use client'
import { RewardsSchema } from '../schemas';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/forms';
import { Input, Textarea } from '@/components/forms';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

export default function RewardFields({ form }: { form: UseFormReturn<z.infer<typeof RewardsSchema>> }) {

    return (
        <>
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem className='space-y-0'>
                        <FormLabel size="tiny">Reward Name</FormLabel>
                        <FormControl>
                            <Input type='text' placeholder="Reward Name" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem className='space-y-0'>
                        <FormLabel size="tiny">Description</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Description" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="limitPerMember"
                render={({ field }) => (
                    <FormItem className='space-y-0'>
                        <FormLabel size="tiny">Limit Per Member</FormLabel>
                        <FormControl>
                            <Input type='number' placeholder="Limit" {...field} onChange={(e) => field.onChange(Number(e.currentTarget.value) || 0)} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="totalLimit"
                render={({ field }) => (
                    <FormItem className='space-y-0'>
                        <FormLabel size="tiny">Limit Total(Leaving it empty will set it to unlimited)</FormLabel>
                        <FormControl>
                            <Input type='number' placeholder="Limit" {...field} onChange={(e) => field.onChange(e.currentTarget.value || "Unlimited")} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="requiredPoints"
                render={({ field }) => (
                    <FormItem className='space-y-0'>
                        <FormLabel size="tiny">Points Awarded</FormLabel>
                        <FormControl>
                            <Input
                                type='number'
                                placeholder="Reward"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.currentTarget.value))}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </>
    )
}
