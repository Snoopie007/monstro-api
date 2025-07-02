import { SheetSection } from '@/components/ui';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Input, Textarea } from '@/components/forms';
import { cn } from '@/libs/utils';
import { AchievementIcons } from './AchievementIcons';
import { PlusIcon, XIcon } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { AchievementSchema } from '../schemas';

export function AchievementFields({ form }: { form: UseFormReturn<z.infer<typeof AchievementSchema>> }) {
    const badge = form.watch('badge')

    return (
        <form className='' >
            <SheetSection>
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
            </SheetSection>
            <SheetSection>
                <div className='bg-foreground/5 p-4 rounded-sm space-y-2'>

                    <div className='text-sm font-semibold'>How it works</div>
                    <p className='text-sm text-muted-foreground'>
                        Points are rewarded for completing of the achievement.
                        Trigger actions are used to progress the achiement. Fro example the # of referral hs reached 5 or 10, etc..
                        Action threshold is the number of times the action must be completed to progress the achievement.
                        Program is the program that the achievement is associated with.
                    </p>
                </div>


                <fieldset>
                    <FormField
                        control={form.control}
                        name="requiredActionCount"
                        render={({ field }) => (
                            <FormItem className='col-span-1'>
                                <FormLabel size={'tiny'}>Action Threshold</FormLabel>
                                <FormControl>
                                    <Input type='number' className={cn()} placeholder="Action Count" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="points"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel size={'tiny'}>Points</FormLabel>
                                <FormControl>
                                    <Input type='text' className={cn()} placeholder="Points" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </fieldset>

            </SheetSection>

        </form>
    )
}
