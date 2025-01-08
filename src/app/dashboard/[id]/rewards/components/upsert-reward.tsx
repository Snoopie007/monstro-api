
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose, Button, ScrollArea } from '@/components/ui';
import { Loader2, Plus } from 'lucide-react';
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

import Image from 'next/image';


const InputStyle = "border bg-transparent w-full rounded-[4px] text-sm text-white py-2 px-4 border-white h-auto  font-roboto";

export interface AddrewardProps {
	reward: Reward | undefined,
	locationId: string
}

export function UpsertReward({ reward, locationId }: AddrewardProps) {
	const [open, setOpen] = useState(false);
	const [rewardImages, setRewardImages] = useState<Array<string>>(reward?.images.length ? reward?.images : []);
	const [rewardImagesUploading, setRewardImagesUploading] = useState(false);
	const [selectedRewardImages, setSelectedRewardImages] = useState<Array<File>>([]);
	const [rewardIcon, setRewardIcon] = useState<string>(reward?.icon ?? "");
	const [selectedRewardIcon, setSelectedRewardIcon] = useState<File | undefined>();
	const [rewardIconUploading, setRewardIconUploading] = useState(false);
	const { mutate } = useSWR(`/api/protected/rewards`);
	const { achievements, isLoading: achievementLoading } = useAchievements(locationId);

	async function uploadImages() {
		if (!selectedRewardImages) return;
		setRewardImagesUploading(true);
		const files = selectedRewardImages;
		const data = new FormData()
		for (const file of files) {
			data.append("files", file)
		}
		data.append("fileDirectory", 'reward-images');
		try {
			const upload = await postFile({ url: 's3-upload/multiple', data: data, id: locationId });
			const urls = upload.map((data: any) => data.url);
			setRewardImages(urls);
			// updateMember({ avatar: avatar.fileUrl })
			setRewardImagesUploading(false);
		} catch (error) {
			console.log(error)
			setRewardImagesUploading(false);
		}
	}

	async function uploadIcon() {
		if (!selectedRewardIcon) return;
		setRewardIconUploading(true);
		const file = selectedRewardIcon;
		const data = new FormData()
		data.append("file", file)
		data.append("fileDirectory", 'reward-icons');
		try {
			const upload = await postFile({ url: 's3-upload', data: data, id: locationId });
			setRewardIcon(upload.url);
			// updateMember({ avatar: avatar.fileUrl })
			setRewardIconUploading(false)
		} catch (error) {
			console.log(error)
			setRewardIconUploading(false)
		}
	}

	const form = useForm<z.infer<typeof RewardsSchema>>({
		resolver: zodResolver(RewardsSchema),
		defaultValues: {
			id: reward?.id || 0,
			name: reward?.name || '',
			description: reward?.description || '',
			requiredPoints: reward?.requiredPoints || 0,
			achievementId: reward?.achievement?.id || 0,
			images: reward?.images || [],
			icon: reward?.icon || "",
			limitPerMember: reward?.limitPerMember || 0,
		},
		mode: "onChange",
	})

	async function submitForm(v: z.infer<typeof RewardsSchema>) {
		console.log(123)
		const body = {
			...v,
			images: rewardImages,
			icon: rewardIcon
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
					<Button variant={"foreground"} size={"xs"} >
						{reward ? (<span>Update Reward</span>) : (<><span> + Reward</span></>)}
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
										<FormLabel>Reward Images</FormLabel>
										<FormControl>
											<input type='file' multiple className={cn(InputStyle)} onInput={(e) => setSelectedRewardImages(Array.from(e.currentTarget.files?.length ? e.currentTarget.files : []))} accept='image/*' />
										</FormControl>
									</FormItem>
									<Button
										className={cn(
											"p-4 bg-indigo-700 text-white rounded-sm children:hidden text-base ",
											{ "children:inline-flex": rewardImagesUploading }
										)}
										disabled={rewardImagesUploading}
										type='button'
										onClick={uploadImages}
									>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Upload
									</Button>
								</fieldset>
								<fieldset className='flex gap-2 mt-2'>
									{rewardImages.map((url: string) => (
										<div key={url} className='h-[80px] relative w-[80px]' >
											<Image src={url} alt="reward gallery" className='object-contain' fill unoptimized />
										</div>
									))}
								</fieldset>
								<fieldset>
									<FormItem className="mb-4 mt-4">
										<FormLabel>Reward Icon</FormLabel>
										<FormControl>
											<input type='file' className={cn(InputStyle)} onInput={(e) => setSelectedRewardIcon(e.currentTarget.files?.length ? e.currentTarget.files[0] : undefined)} accept='image/png' />
										</FormControl>
									</FormItem>
									<Button
										className={cn(
											"p-4 bg-indigo-700 text-white rounded-sm children:hidden text-base ",
											{ "children:inline-flex": rewardIconUploading }
										)}
										disabled={rewardIconUploading && !selectedRewardIcon}
										type='button'
										onClick={uploadIcon}
									>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Upload
									</Button>
								</fieldset>
								<fieldset className='flex gap-2 mt-2'>
									{rewardIcon &&
										<div className='h-[80px] relative w-[80px]' >
											<Image src={rewardIcon} alt="reward gallery" className='object-contain' fill unoptimized />
										</div>
									}
								</fieldset>
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
								<fieldset>
									<FormField
										control={form.control}
										name="requiredPoints"
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
