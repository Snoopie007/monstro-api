
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose, Button, ScrollArea } from '@/components/ui';
import { Plus } from 'lucide-react';
import { z } from "zod";
import React, { useState } from 'react'
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Achievement, Reward } from '@/types';
import {
	Form, FormControl, FormField, FormMessage, FormItem, FormLabel,
	Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/forms';
import { cn } from '@/libs/utils';
import { Input } from "@/components/forms/input"
import { addReward, postFile, updateReward } from '@/libs/api';
import { toast } from 'react-toastify';
import useSWR from 'swr';
import { RewardsSchema } from '../schemas';
import { Textarea } from '@/components/forms/textarea';
import { useAchievements } from '@/hooks/use-achievements';


const InputStyle = "border bg-transparent w-full rounded-[4px] text-sm text-white py-2 px-4 border-white h-auto  font-roboto";

export interface AddrewardProps {
	reward: Reward | undefined,
	locationId: string
}

export function UpsertReward({ reward, locationId }: AddrewardProps) {
	const [open, setOpen] = useState(false);
	const [rewardImage, setRewardImage] = useState('');
	const { mutate } = useSWR(`/api/protected/rewards`);
	const { achievements, isLoading: achievementLoading } = useAchievements(locationId);

	async function uploadImage(files: FileList | null) {
		if (!files) return;
		const file = files[0];
		const data = new FormData()
		data.append("file", file)
		data.append("fileDirectory", 'reward-images');
		try {
			const upload = await postFile({ url: 'upload', data: data, id: locationId });
			setRewardImage(upload.url);
			// updateMember({ avatar: avatar.fileUrl })
		} catch (error) {
			console.log(error)
		}
	}

	const typeData = [
		{ id: 1, name: 'achievements' },
		{ id: 2, name: 'reward points' }
	];

	const form = useForm<z.infer<typeof RewardsSchema>>({
		resolver: zodResolver(RewardsSchema),
		defaultValues: {
			id: reward?.id || 0,
			name: reward?.name || '',
			description: reward?.description || '',
			rewardPoints: reward?.rewardPoints || 0,
			achievementId: reward?.achievementId || 0,
			image: reward?.image || '',
			limitPerMember: reward?.limitPerMember || 0,
			type: reward?.type || 1

		},
		mode: "onChange",
	})

	async function submitForm(v: z.infer<typeof RewardsSchema>) {
		const body = {
			...v,
			image: rewardImage
		};
		try {
			if (reward) {
				// Await the updateProgramLevel call
				await updateReward(Number(v.id), body, locationId);
				setOpen(false)
				await mutate();
				toast.success("Reward Updated");
				form.reset();
			} else {
				// Await the addProgramLevel call
				await addReward(body, locationId);
				setOpen(false)
				await mutate();
				toast.success("Reward Added");
				form.reset();
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
						{reward ? (<span>Update Reward</span>) : (<><Plus size={17} /> <span> Add Reward</span></>)}
					</Button>
				</SheetTrigger>
				<SheetContent className="max-w-[40%] bg-background w-[40%] sm:max-w-[540px] sm:w-[540px] p-0">
					<SheetHeader className="px-6 pt-4 pb-2 border-b">
						{reward ? (<SheetTitle>Update Reward</SheetTitle>) : (<SheetTitle>Add a New Reward</SheetTitle>)}
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
												<FormLabel>Reward Name</FormLabel>
												<FormControl>
													<Input type='text' className={cn(InputStyle)} placeholder="Reward Name" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>

										)}
									/>
									<FormField
										control={form.control}
										name="description"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Description</FormLabel>
												<FormControl>
													<Textarea className={cn(InputStyle)} placeholder="Description" {...field} />
												</FormControl>

												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="limitPerMember"
										render={({ field }) => (
											<FormItem className="mb-4">
												<FormLabel>Limit Per Member</FormLabel>
												<FormControl>
													<Input type='text' className={cn(InputStyle)} placeholder="Limit" {...field} onChange={(e) => field.onChange(Number(e.currentTarget.value))} />
												</FormControl>
												<FormMessage />
											</FormItem>

										)}
									/>

								</fieldset>
								<fieldset>
									<FormItem className="mb-4 mt-4">
										<FormLabel>Reward Image</FormLabel>
										<FormControl>
											<input type='file' className={cn(InputStyle)} onInput={(e) => uploadImage(e.currentTarget.files)} />
										</FormControl>
									</FormItem>
								</fieldset>
								<fieldset>
									<FormField
										control={form.control}
										name="type"
										render={({ field }) => (
											<FormItem className="flex-1">
												<FormLabel className="font-semibold">
													Type
												</FormLabel>
												<Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value.toString()}>
													<FormControl>
														<SelectTrigger className="rounded-sm" >
															<SelectValue placeholder="Select Type" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{typeData.map((type, index) => (
															<SelectItem key={index} value={type.id.toString()}>
																{type.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>

												<FormMessage />
											</FormItem>
										)}
									/>
								</fieldset>
								{form.getValues('type') == 1 ?
									<fieldset>
										<FormField
											control={form.control}
											name="achievementId"
											render={({ field }) => (
												<FormItem className="mb-4">
													<FormLabel>Achievements</FormLabel>
													<Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field?.value?.toString()}>
														<FormControl>
															<SelectTrigger className="rounded-sm" >
																<SelectValue placeholder="Select Achievement" />
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															{!achievementLoading && achievements.achievements.map((achievement: Achievement, index: number) => (
																<SelectItem key={index} value={achievement?.id ? achievement?.id?.toString() : '0'}>
																	{achievement?.name}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>

											)}
										/>
									</fieldset>
									:
									<fieldset>
										<FormField
											control={form.control}
											name="rewardPoints"
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
								}
							</form>
						</Form>
					</ScrollArea>
					<SheetFooter className='border-t py-4 px-5'>
						<SheetClose asChild>
							<Button onClick={form.handleSubmit(submitForm)} className=" py-2.5 px-4 rounded-sm text-sm flex flex-row bg-white text-black hover:text-white h-auto">
								{reward ? (<span>Update</span>) : (<React.Fragment><Plus size={17} /> <span> Add</span></React.Fragment>)}
							</Button>
						</SheetClose>

					</SheetFooter>


				</SheetContent>
			</Sheet >
		</div >
	)
}
