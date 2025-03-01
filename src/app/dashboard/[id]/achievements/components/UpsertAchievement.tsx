'use client'

import {
	Sheet, Button, SheetContent, SheetHeader, SheetTitle,
	SheetTrigger, SheetFooter, SheetClose, ScrollArea, SheetFieldInput, SheetFieldLabel, SheetFieldSet, SheetSection
} from '@/components/ui';

import { z } from "zod";
import { SetStateAction, Dispatch, useState } from 'react'
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Achievement, Action, Program } from '@/types';
import { cn, tryCatch } from '@/libs/utils';
import { Input } from "@/components/forms/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Form, FormControl, FormField, FormMessage, FormItem, FormLabel } from '@/components/forms';
import { toast } from 'react-toastify';
import { usePrograms } from '@/hooks/use-programs';
import { useActions } from '@/hooks/use-actions';
import useSWR from 'swr';
import { AchievementSchema } from '../schemas';



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

	async function submitForm(v: z.infer<typeof AchievementSchema>) {
		const body = v;

		const { result, error } = await tryCatch(
			fetch(`/api/protected/${locationId}/achievements`, {
				method: achievement?.id ? 'PUT' : 'POST',
				body: JSON.stringify(body),
			})
		)

		if (error || !result || !result.ok) {
			toast.error("Something went wrong, please try again later");
		}
		await mutate();
		toast.success("Achievement Saved");


	};
	return (
		<div>
			<Sheet open={!!achievement} onOpenChange={(setOpen) => {
				if (!setOpen) {
					form.reset();
				}
			}}>

				<SheetContent className="max-w-[40%] bg-background w-[40%] sm:max-w-[540px] sm:w-[540px] p-0">
					<SheetHeader className=" border-b">
						<SheetTitle className='text-base font-semibold'>{achievement?.id ? 'Update Achievement' : 'Add Achievement'}</SheetTitle>
					</SheetHeader>
					<ScrollArea className="h-[calc(100vh-150px)] w-full ">

						<Form {...form}>
							<form className='' >
								<SheetSection>
									<SheetFieldSet>
										<SheetFieldLabel>
											<FormLabel>Achievement Title</FormLabel>
										</SheetFieldLabel>
										<SheetFieldInput>
											<FormField
												control={form.control}
												name="title"
												render={({ field }) => (
													<FormItem>
														<FormControl>
															<Input type='text' className={cn()} placeholder="Achievement Title" {...field} />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										</SheetFieldInput>
									</SheetFieldSet>
									<SheetFieldSet>
										<SheetFieldLabel>
											<FormLabel>Achievement Description</FormLabel>
										</SheetFieldLabel>
										<SheetFieldInput>
											<FormField
												control={form.control}
												name="description"
												render={({ field }) => (
													<FormItem>
														<FormControl>
															<Input type='text' className={cn()} placeholder="Achievement Description" {...field} />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										</SheetFieldInput>
									</SheetFieldSet>
									<SheetFieldSet>
										<SheetFieldLabel>
											<FormLabel>Achievement Badge</FormLabel>
										</SheetFieldLabel>
										<SheetFieldInput>
											<FormField
												control={form.control}
												name="badge"
												render={({ field }) => (
													<FormItem>
														<FormControl>
															<Input type='text' className={cn()} placeholder="Achievement Badge" {...field} />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										</SheetFieldInput>
									</SheetFieldSet>
									<SheetFieldSet>
										<SheetFieldLabel>
											<FormLabel>Points</FormLabel>
										</SheetFieldLabel>
										<SheetFieldInput>
											<FormField
												control={form.control}
												name="points"
												render={({ field }) => (
													<FormItem>
														<FormControl>
															<Input type='text' className={cn()} placeholder="Points" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										</SheetFieldInput>
									</SheetFieldSet>
								</SheetSection>
								<SheetSection>


									<SheetFieldSet>
										<SheetFieldLabel>
											<FormLabel>Action</FormLabel>
										</SheetFieldLabel>
										<SheetFieldInput>
											<FormField
												control={form.control}
												name="action"
												render={({ field }) => (
													<FormItem>
														<Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value.toString()}>
															<SelectTrigger className="w-full border rounded-sm bg-transparent font-normal border-white">
																<SelectValue placeholder="Select an action" />
															</SelectTrigger>
															<SelectContent>
																{actions.map((action: Action, index: number) => (
																	<SelectItem key={index} value={action.id.toString()}>{action.name}</SelectItem>
																))}
															</SelectContent>
														</Select>
														<FormMessage />
													</FormItem>
												)}
											/>
										</SheetFieldInput>
									</SheetFieldSet>

									<SheetFieldSet>
										<SheetFieldLabel>
											<FormLabel>Action Count</FormLabel>
										</SheetFieldLabel>
										<SheetFieldInput>
											<FormField
												control={form.control}
												name="actionCount"
												render={({ field }) => (
													<FormItem>
														<FormControl>
															<Input type='number' className={cn()} placeholder="Action Count" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										</SheetFieldInput>
									</SheetFieldSet>

									<SheetFieldSet>
										<SheetFieldLabel>
											<FormLabel>Program</FormLabel>
										</SheetFieldLabel>
										<SheetFieldInput>
											<FormField
												control={form.control}
												name="program"
												render={({ field }) => (
													<FormItem>
														<Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value.toString()}>
															<SelectTrigger className="w-full border rounded-sm bg-transparent font-normal border-white">
																<SelectValue placeholder="Select a program" />
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
										</SheetFieldInput>
									</SheetFieldSet>
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
