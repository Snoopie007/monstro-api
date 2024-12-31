'use client'

import { Sheet, Button, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose, ScrollArea } from '@/components/ui';
import { Plus } from 'lucide-react';
import { z } from "zod";
import { useState } from 'react'
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Achievement, Action, Program } from '@/types';
import { cn } from '@/libs/utils';
import { Input } from "@/components/forms/input"
import { addAchievment, updateAchievment } from '@/libs/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Form, FormControl, FormField, FormMessage, FormItem, FormLabel } from '@/components/forms';
import { toast } from 'react-toastify';
import { usePrograms } from '@/hooks/use-programs';
import { useActions } from '@/hooks/use-actions';
import useSWR from 'swr';
import { AchievementSchema } from '../schemas';


const InputStyle = "border bg-transparent w-full rounded-[4px] text-sm text-white py-2 px-4 border-white h-auto  font-roboto";

export interface AddAchievementProps {
	achievement: Achievement | undefined,
	locationId: string
}

export function UpsertAchivement({ achievement, locationId }: AddAchievementProps) {
	const [open, setOpen] = useState(false);
	const { mutate } = useSWR(`/api/protected/achievements`);
	const { data } = usePrograms(locationId);
	const { actions } = useActions(locationId);
	const form = useForm<z.infer<typeof AchievementSchema>>({
		resolver: zodResolver(AchievementSchema),
		defaultValues: {
			id: achievement?.id || 0,
			name: achievement?.name || '',
			badge: achievement?.badge || '',
			points: Number(achievement?.points) || 0,
			actionCount: (Array.isArray(achievement?.action) ? achievement?.action[0].pivot.count : 0) || 0,
			action: (Array.isArray(achievement?.action) ? achievement?.action[0].id : 0) || 0,
			program: achievement?.program?.id || 0
		},
		mode: "onChange",
	})

	async function submitForm(v: z.infer<typeof AchievementSchema>) {
		const body = {
			...v
		};
		try {
			if (achievement) {
				// Await the updateProgramLevel call
				await updateAchievment(Number(v.id), body, locationId);
				setOpen(false)
				toast.success("Achievement Updated");
			} else {
				// Await the addProgramLevel call
				await addAchievment(body, locationId);
				setOpen(false)
				toast.success("Achievement Added");
			}
		} catch (error) {
			console.error("Error:", error); // Add logging for debugging
			toast.error("Something went wrong, please try again later");
		}
	};
	return (
		<div>
			<Sheet open={open} onOpenChange={setOpen}>
				<SheetTrigger asChild>
					<Button className="font-semibold py-2.5 px-4 text-sm flex flex-row bg-foreground text-background h-auto ">
						{achievement ? (<span>Update Achievement</span>) : (<><Plus size={17} /> <span> Add Achievement</span></>)}
					</Button>
				</SheetTrigger>
				<SheetContent className="max-w-[40%] bg-background w-[40%] sm:max-w-[540px] sm:w-[540px] p-0">
					<SheetHeader className="px-6 pt-4 pb-2 border-b">
						{achievement ? (<SheetTitle>Update Achievement</SheetTitle>) : (<SheetTitle>Add a New Achievement</SheetTitle>)}
					</SheetHeader>
					<ScrollArea className="h-[calc(100vh-150px)] w-full ">

						<Form {...form}>
							<form className='px-5 py-4' >
								<fieldset>
									<FormField
										control={form.control}
										name="name"
										render={({ field }) => (
											<FormItem className="mb-4">
												<FormLabel>Achievement Name</FormLabel>
												<FormControl>
													<Input type='text' className={cn(InputStyle)} placeholder="Achievement Name" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>

										)}
									/>
									<FormField
										control={form.control}
										name="badge"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Achievement Badge</FormLabel>
												<FormControl>
													<Input type='text' className={cn(InputStyle)} placeholder="Achievement Badge" {...field} />
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
											<FormItem className="mb-4">
												<FormLabel>Points</FormLabel>
												<FormControl>
													<Input type='text' className={cn(InputStyle)} placeholder="Reward" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
												</FormControl>
												<FormMessage />
											</FormItem>

										)}
									/>
								</fieldset>
								{!achievement && (
									<>

										<fieldset>
											<FormField
												control={form.control}
												name="actionCount"
												render={({ field }) => (
													<FormItem className="mb-4">
														<FormLabel>Action Count</FormLabel>
														<FormControl>
															<Input type='text' className={cn(InputStyle)} placeholder="Action Count" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
														</FormControl>
														<FormMessage />
													</FormItem>

												)}
											/>
										</fieldset>
										<fieldset>
											<FormField
												control={form.control}
												name="action"
												render={({ field }) => (
													<FormItem className='flex-initial min-w-[30%]'>
														<FormLabel>Action</FormLabel>
														<Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value.toString()}>
															<SelectTrigger className="w-full border rounded-sm bg-transparent font-normal border-white">
																<SelectValue placeholder="Select a day" />
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
										</fieldset>
										<fieldset>
											<FormField
												control={form.control}
												name="program"
												render={({ field }) => (
													<FormItem className='flex-initial min-w-[30%]'>
														<FormLabel>Program</FormLabel>
														<Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value.toString()}>
															<SelectTrigger className="w-full border rounded-sm bg-transparent font-normal border-white">
																<SelectValue placeholder="Select a Program" />
															</SelectTrigger>
															<SelectContent>
																{data.programs?.map((program: Program, index: number) => (
																	<SelectItem key={index} value={program.id.toString()}>{program.name}</SelectItem>
																))}
															</SelectContent>
														</Select>
														<FormMessage />
													</FormItem>
												)}
											/>
										</fieldset>
									</>
								)}
							</form>
						</Form>
					</ScrollArea>
					<SheetFooter className='border-t py-4 px-5'>
						<SheetClose asChild>
							<Button onClick={form.handleSubmit(submitForm)} className=" py-2.5 px-4 rounded-sm text-sm flex flex-row bg-white text-black hover:text-white h-auto">
								{achievement ? (<span>Update</span>) : (<><Plus size={17} /> <span> Add</span></>)}
							</Button>
						</SheetClose>

					</SheetFooter>


				</SheetContent>
			</Sheet >
		</div >
	)
}
