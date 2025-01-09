
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose, Button, ScrollArea, SheetFieldSet, SheetFieldLabel, SheetFieldInput, SheetSection } from '@/components/ui';
import { Camera, Loader2, Plus, Trash2Icon, UploadCloudIcon } from 'lucide-react';
import { z } from "zod";
import React, { SetStateAction, Dispatch, useState, useRef, useEffect } from 'react'
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

import Image from 'next/image';
import { RewardImages } from './reward-images';
import RewardIcon from './reward-icon';


const InputStyle = "border bg-transparent w-full rounded-[4px] text-sm text-white py-2 px-4 border-white h-auto  font-roboto";

export interface AddrewardProps {
	reward: Reward | undefined,
	locationId: string,
	setCurrentReward: Dispatch<SetStateAction<Reward | undefined>>

}

export function UpsertReward({ reward, locationId, setCurrentReward }: AddrewardProps) {

	const { mutate } = useSWR(`/api/protected/rewards`);
	const [loading, setLoading] = useState(false);
	const iconRef = useRef<HTMLInputElement>(null);

	const [rewardImages, setRewardImages] = useState<File[]>([]);
	const [redwardIcon, setRewardIcon] = useState<File | undefined>();


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

	// async function uploadImages() {
	// 	if (!selectedRewardImages) return;
	// 	setLoading(true);
	// 	const files = selectedRewardImages;
	// 	const data = new FormData()
	// 	for (const file of files) {
	// 		data.append("files", file)
	// 	}
	// 	data.append("fileDirectory", 'reward-images');
	// 	try {
	// 		const upload = await postFile({ url: 's3-upload/multiple', data: data, id: locationId });
	// 		const urls = upload.map((data: Record<string, any>) => data.url);
	// 		setRewardImages(urls);

	// 		setLoading(false);
	// 	} catch (error) {
	// 		console.log(error)
	// 		setLoading(false);
	// 	}
	// }

	// async function uploadIcon() {
	// 	if (!selectedRewardIcon) return;
	// 	setLoading(true);
	// 	const file = selectedRewardIcon;
	// 	const data = new FormData()
	// 	data.append("file", file)
	// 	data.append("fileDirectory", 'reward-icons');
	// 	try {
	// 		const upload = await postFile({ url: 's3-upload', data: data, id: locationId });
	// 		// setRewardIcon(upload.url);
	// 		// updateMember({ avatar: avatar.fileUrl })
	// 		setLoading(false)
	// 	} catch (error) {
	// 		console.log(error)
	// 		setLoading(false)
	// 	}
	// }



	async function submitForm(v: z.infer<typeof RewardsSchema>) {
		setLoading(true);
		const body = v;
		try {
			if (redwardIcon) {
				const icon = await postFile({ url: 's3-upload', data: { file: redwardIcon, fileDirectory: 'reward-icons' }, id: locationId });
				body.icon = icon.url;
			}
			if (rewardImages.length > 0) {
				const images = await postFile({ url: 's3-upload/multiple', data: { files: rewardImages, fileDirectory: 'reward-images' }, id: locationId });
				body.images = images.map((image: Record<string, any>) => image.url);
			}
			if (reward?.id) {
				await updateReward(Number(v.id), body, locationId);
			} else {
				await addReward(body, locationId);
			}


			await mutate();
			toast.success("Reward Updated");
			form.reset();
			setCurrentReward(undefined);
		} catch (error) {
			console.error("Error:", error);
			setCurrentReward(undefined);
			toast.error("Something went wrong, please try again later");
		}
	};

	return (
		<Sheet open={!!reward} onOpenChange={(open) => !open && setCurrentReward(undefined)}>
			<SheetContent className="bg-background sm:max-w-[550px] sm:w-[550px] p-0">
				<SheetHeader className="px-3 py-3">

					<SheetTitle className='text-sm font-semibold'>Update Reward</SheetTitle>
				</SheetHeader>
				<ScrollArea className="h-[calc(100vh-150px)] w-full ">
					<Form {...form}>
						<form  >
							<SheetSection >

								<RewardIcon
									value={form.getValues("icon")}
									onFilesChange={setRewardIcon}
								/>

							</SheetSection>
							<SheetSection>
								<SheetFieldSet>
									<SheetFieldLabel>
										<FormLabel>Reward Name</FormLabel>
									</SheetFieldLabel>
									<SheetFieldInput>
										<FormField
											control={form.control}
											name="name"
											render={({ field }) => (
												<FormItem className="mb-4">

													<FormControl>
														<Input type='text' className={cn(InputStyle)} placeholder="Reward Name" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>

											)}
										/>
									</SheetFieldInput>
								</SheetFieldSet>
								<SheetFieldSet>
									<SheetFieldLabel>
										<FormLabel>Description</FormLabel>
									</SheetFieldLabel>
									<SheetFieldInput>
										<FormField
											control={form.control}
											name="description"
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<Textarea className={cn(InputStyle)} placeholder="Description" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</SheetFieldInput>
								</SheetFieldSet>
								<SheetFieldSet>
									<SheetFieldLabel>
										<FormLabel>Limit Per Member</FormLabel>
									</SheetFieldLabel>
									<SheetFieldInput>
										<FormField
											control={form.control}
											name="limitPerMember"
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<Input type='text' className={cn(InputStyle)} placeholder="Limit" {...field} onChange={(e) => field.onChange(Number(e.currentTarget.value))} />
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
											name="requiredPoints"
											render={({ field }) => (
												<FormItem>

													<FormControl>
														<Input type='text' className={cn(InputStyle)} placeholder="Reward" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
													</FormControl>
													<FormMessage />
												</FormItem>

											)}
										/>
									</SheetFieldInput>
								</SheetFieldSet>
							</SheetSection>
							<SheetSection>
								<RewardImages
									value={form.getValues("images")}
									onFilesChange={setRewardImages} />
							</SheetSection>



						</form>
					</Form>
				</ScrollArea>
				<SheetFooter className='border-t py-3 px-4'>
					<SheetClose asChild>
						<Button variant={'outline'} size={'xs'} onClick={() => setCurrentReward(undefined)}>
							Cancel
						</Button>
					</SheetClose>
					<SheetClose asChild>
						<Button variant={'foreground'} size={'xs'} onClick={form.handleSubmit(submitForm)}>
							Save
						</Button>
					</SheetClose>

				</SheetFooter>


			</SheetContent >
		</Sheet >
	)
}
