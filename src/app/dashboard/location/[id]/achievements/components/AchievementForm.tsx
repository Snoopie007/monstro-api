'use client'
import { SheetClose, SheetSection, SheetFooter, Button } from '@/components/ui';

import {
    FormField, FormItem, FormLabel, FormControl, FormMessage, Input,
    Textarea, Form
} from '@/components/forms';
import { cn, tryCatch } from '@/libs/utils';
import { AchievementIcons } from '.';
import { Loader2, PlusIcon, XIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AchievementSchema } from '../schemas';
import { toast } from 'react-toastify';
import { zodResolver } from '@hookform/resolvers/zod';
import { Achievement } from '@/types';
import { useAchievements } from '../providers';

interface AchievementFieldsProps {
    lid: string;
    onFinish: (achievement: Achievement) => void;
}

export function AchievementForm({ lid, onFinish }: AchievementFieldsProps) {

    const { setAchievements } = useAchievements();
    const form = useForm<z.infer<typeof AchievementSchema>>({
        resolver: zodResolver(AchievementSchema),
        defaultValues: {
            name: '',
            description: '',
            badge: '',
            awardedPoints: 0,
            requiredCount: 0,

        },
        mode: "onChange"
    })

    const badge = form.watch('badge')
    async function onSubmit(v: z.infer<typeof AchievementSchema>) {
        const formData = new FormData();

        Object.entries(v).forEach(([key, value]) => {
            if (key !== 'badge' && value !== undefined) {
                formData.append(key, value.toString());
            }
        });


        if (v.badge && v.badge.startsWith('blob:')) {
            const blob = await fetch(v.badge).then(r => r.blob());
            formData.append('file', blob, 'badge.png');
        } else if (v.badge) {
            formData.append('badge', v.badge);
        }

        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/achievements`, {
                method: 'POST',
                body: formData,
            })
        );

        if (error || !result || !result.ok) {
            toast.error("Something went wrong, please try again later");
            return;
        }
        const data = await result.json();
        setAchievements((prev) => [...prev, data]);
        form.reset();
        onFinish(data);
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <SheetSection className='border-b-0'>
                    <fieldset>
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel size={'tiny'}> Name</FormLabel>
                                    <FormControl>
                                        <Input type='text' className={cn()} placeholder="Name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </fieldset>
                    <fieldset>
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel size={'tiny'}> Description</FormLabel>
                                    <FormControl>
                                        <Textarea className={cn('resize-none h-20 border-foreground/10')} placeholder="Description" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </fieldset>
                    <fieldset>
                        <div className='flex flex-row gap-4'>
                            <div className='flex-initial  mt-2'>
                                {badge ? (
                                    <div className='relative group  rounded-md  overflow-hidden size-10'>
                                        <img src={badge} alt='badge' width={50} height={50} className='rounded-md' />
                                        <div className={cn('absolute top-0 right-0 w-full h-full flex items-center justify-center bg-red-500 text-white ',
                                            'cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-300')}
                                            onClick={() => {
                                                form.setValue('badge', '')
                                            }}>
                                            <XIcon className='size-6' />
                                        </div>
                                    </div>
                                ) : (

                                    <div className='size-10 bg-foreground/5 rounded-md flex items-center justify-center' >
                                        <PlusIcon className='size-4 text-muted-foreground' />
                                    </div>
                                )}
                            </div>
                            <FormField
                                control={form.control}
                                name="badge"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel size={'tiny'}>Choose an Icon</FormLabel>
                                        <FormControl>
                                            <AchievementIcons value={field.value} handleIconChange={(icon) => {
                                                form.setValue('badge', icon)
                                            }} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </fieldset>
                    <fieldset className='space-y-1'>
                        <p className='bg-foreground/5 p-4 rounded-sm text-sm text-muted-foreground'>
                            Points are rewarded for completing of the achievement.
                            Required count is the number of times the action must be completed to progress the achievement.
                        </p>
                        <div className='grid grid-cols-2 gap-4'>
                            <FormField
                                control={form.control}
                                name="requiredCount"
                                render={({ field }) => (
                                    <FormItem className='col-span-1'>
                                        <FormLabel size={'tiny'}>Required Count</FormLabel>
                                        <FormControl>
                                            <Input type='number' className={cn()} placeholder="Action Count" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="awardedPoints"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel size={'tiny'}>Points Awarded</FormLabel>
                                        <FormControl>
                                            <Input type='text' className={cn()} placeholder="Points" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </fieldset>

                </SheetSection>
                <SheetFooter className='border-t border-foreground/10 py-3 px-4'>
                    <SheetClose asChild>
                        <Button variant={"outline"} size={"sm"}>
                            Cancel
                        </Button>
                    </SheetClose>
                    <Button variant={"foreground"} size={"sm"} disabled={form.formState.isSubmitting} type='submit'>
                        {form.formState.isSubmitting ? <Loader2 className='size-4 animate-spin' /> : 'Create'}
                    </Button>
                </SheetFooter>
            </form>
        </Form>
    )
}


