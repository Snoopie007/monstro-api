'use client'

import {
	Sheet, Button, SheetContent, SheetHeader, SheetTitle,
	SheetFooter, SheetClose, ScrollArea, SheetSection
} from '@/components/ui';

import { z } from "zod";
import { SetStateAction, Dispatch, useState } from 'react'
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Achievement, Action, Program } from '@/types';
import { cn, tryCatch } from '@/libs/utils';
import {
	Select, SelectContent, SelectItem,
	SelectTrigger,
	Input,
	SelectValue, Form, FormControl, FormField,
	FormMessage, FormItem, FormLabel, Textarea
} from '@/components/forms';
import { toast } from 'react-toastify';
import { usePrograms } from '@/hooks/usePrograms';
import useSWR from 'swr';
import { AchievementSchema } from '../schemas';
import { useActions } from '@/hooks';
import { AchievementIcons } from './AchievementIcons';
import { PlusIcon, XIcon } from 'lucide-react';



export interface AddAchievementProps {
	achievement: Achievement | undefined,
	locationId: string,
	setCurrentAchievement: Dispatch<SetStateAction<Achievement | undefined>>
}


export function UpsertAchivement({ achievement, locationId, setCurrentAchievement }: AddAchievementProps) {
	const { mutate } = useSWR(`/api/protected/achievements`);
	const { data } = usePrograms(locationId);
	const { actions } = useActions(locationId);

	const form = useForm<z.infer<typeof AchievementSchema>>({
		resolver: zodResolver(AchievementSchema),
		defaultValues: {
			id: achievement?.id ?? 0,
			title: achievement?.title ?? '',
			description: achievement?.description ?? '',
			icon: achievement?.icon ?? '',
			badge: achievement?.badge ?? '',
			points: achievement?.points ?? 0,
			actionCount: achievement?.actions?.[0]?.count ?? 0,
			action: achievement?.actions?.[0]?.id ?? 0,
			program: achievement?.program?.id ?? 0
		},
		mode: "onChange"
	})

	const badge = form.watch('badge')


	async function submitForm(v: z.infer<typeof AchievementSchema>) {
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
        fetch(`/api/protected/loc/${locationId}/achievements${achievement?.id ? `/${achievement.id}` : ''}`, {
            method: achievement?.id ? 'PUT' : 'POST',
            body: formData,
        })
    );

    if (error || !result || !result.ok) {
        toast.error("Something went wrong, please try again later");
        return;
    }
    
    await mutate();
    toast.success("Achievement Saved");
    form.reset();
    setCurrentAchievement(undefined);
}
	return (
		<div>
			<Sheet open={!!achievement} onOpenChange={(setOpen) => {
				if (!setOpen) {
					form.reset();
				}
			}}>

				<SheetContent className="max-w-[40%] bg-background w-[40%] sm:max-w-[540px] sm:w-[540px] p-0">
					<SheetHeader className=" border-b">
						<SheetTitle className='text-base font-semibold'>
							{achievement?.id ? 'Update Achievement' : 'Add Achievement'}
						</SheetTitle>
					</SheetHeader>
					<ScrollArea className="h-[calc(100vh-150px)] w-full ">

						<Form {...form}>
							<form className='' >
								<SheetSection>
									<fieldset>
										<FormField
											control={form.control}
											name="title"
											render={({ field }) => (
												<FormItem>
													<FormLabel size={'tiny'}>Achievement Title</FormLabel>
													<FormControl>
														<Input type='text' className={cn()} placeholder="Achievement Title" {...field} />
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
													<FormLabel size={'tiny'}>Achievement Description</FormLabel>
													<FormControl>
														<Textarea className={cn('resize-none h-20')} placeholder="Achievement Description" {...field} />
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

									<fieldset className='grid grid-cols-2 gap-2'>
										<FormField
											control={form.control}
											name="action"
											render={({ field }) => (
												<FormItem className='col-span-1'>
													<FormLabel size={'tiny'}>Trigger Action</FormLabel>
													<FormControl>
														<Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value.toString()}>
															<SelectTrigger className="w-full border font-normal ">
																<SelectValue placeholder="Select an action" className='text-xs' />
															</SelectTrigger>
															<SelectContent>
																{actions && actions.map((action: Action, index: number) => (
																	<SelectItem key={index} value={action.id.toString()}>{action.name}</SelectItem>
																))}
															</SelectContent>
														</Select>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="actionCount"
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
									</fieldset>
									<fieldset>
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
									<fieldset>
										<FormField
											control={form.control}
											name="program"
											render={({ field }) => (
												<FormItem>
													<FormLabel size={'tiny'}>Program</FormLabel>
													<Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value.toString()}>
														<SelectTrigger className="w-full border font-normal ">
															<SelectValue placeholder="Select a program" className='text-xs' />
														</SelectTrigger>
														<SelectContent>
															{data.map((program: Program, index: number) => (
																<SelectItem key={index} value={program.id.toString()}>{program.name}</SelectItem>
															))}
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											)}
										/>
									</fieldset>
								</SheetSection>

							</form>
						</Form>
					</ScrollArea>
					<SheetFooter className='border-t py-3 px-4'>
						<SheetClose asChild>
							<Button
								variant={"outline"} size={"xs"}
								onClick={() => setCurrentAchievement(undefined)}
							>
								Close
							</Button>
						</SheetClose>
						<SheetClose asChild>
							<Button
								onClick={form.handleSubmit(submitForm)}
								variant={"foreground"} size={"xs"}
							>
								Create
							</Button>
						</SheetClose>
					</SheetFooter>


				</SheetContent>
			</Sheet >
		</div >
	)
}
