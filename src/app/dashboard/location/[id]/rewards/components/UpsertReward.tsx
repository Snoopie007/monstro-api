import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose, Button, ScrollArea, SheetFieldSet, SheetFieldLabel, SheetFieldInput, SheetSection } from '@/components/ui';
import { z } from "zod";
import React, { SetStateAction, Dispatch, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Reward } from '@/types';
import {
	Form, FormControl, FormField, FormMessage, FormItem, FormLabel
} from '@/components/forms';
import { cn, tryCatch } from '@/libs/utils';
import { Input } from "@/components/forms/input"
import { toast } from 'react-toastify';
import useSWR from 'swr';
import { RewardsSchema } from '../schemas';
import { Textarea } from '@/components/forms/textarea';
import { RewardImages } from './RewardImages';
import { Loader2 } from 'lucide-react';

const InputStyle = "border border-foreground/10 ";

export interface AddrewardProps {
	reward: Reward | undefined,
	locationId: string,
	setCurrentReward: Dispatch<SetStateAction<Reward | undefined>>
}

export function UpsertReward({ reward, locationId, setCurrentReward }: AddrewardProps) {
	const { mutate } = useSWR(`/api/protected/${locationId}/rewards`);
	const [loading, setLoading] = useState(false);
	const [removedImages, setRemovedImages] = useState<string[]>([]);
	const [files, setFiles] = useState<File[]>([]);

	const form = useForm<z.infer<typeof RewardsSchema>>({
		resolver: zodResolver(RewardsSchema),
		defaultValues: {
			name: reward?.name || '',
			description: reward?.description || '',
			requiredPoints: reward?.requiredPoints || 0,
			totalLimit: reward?.totalLimit || "Unlimited",
			limitPerMember: reward?.limitPerMember || 0,
		},
		mode: "onChange",
	})

	useEffect(() => {
		if (reward) {
			form.reset(reward);
		}
	}, [reward]);




	async function handleSubmit(data: z.infer<typeof RewardsSchema>) {
		if (!form.formState.isValid) return form.trigger();

		setLoading(true);
		const formData = new FormData();

		// Add form data fields using Object.entries
		Object.entries(data).forEach(([key, value]) => {
			formData.append(key, value.toString());
		});

		// Handle removed images
		removedImages.forEach(image => {
			formData.append('removedImages', image);
		});

		// Handle existing images
		reward?.images?.forEach(image => {
			formData.append('images', image);
		});

		// Handle new files
		files.forEach(file => {
			formData.append('files', file);
		});

		const { result, error } = await tryCatch(
			fetch(`/api/protected/loc/${locationId}/rewards${reward?.id ? `/${reward.id}` : ''}`, {
				method: reward?.id ? 'PUT' : 'POST',
				body: formData,
			})
		)

		setLoading(false);
		if (error || !result) {
			toast.error("Something went wrong, please try again later");
			return;
		}

		await mutate();
		setRemovedImages([]);
		setFiles([]);
		toast.success("Reward Updated");
		form.reset();
		setCurrentReward(undefined);

	};


	return (
		<Sheet open={!!reward} onOpenChange={(open) => !open && setCurrentReward(undefined)}>
			<SheetContent className="bg-background border-foreground/10 sm:max-w-[550px] sm:w-[550px] p-0">
				<SheetHeader className="py-3 border-b border-foreground/10">
					<SheetTitle className='text-sm font-semibold'>{reward?.id ? "Update Reward" : "Create Reward"}</SheetTitle>
				</SheetHeader>
				<ScrollArea className="h-[calc(100vh-150px)] w-full ">
					<Form {...form}>
						<form >
							<SheetSection>
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem className='space-y-0'>
											<FormLabel size="tiny">Reward Name</FormLabel>
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
										<FormItem className='space-y-0'>
											<FormLabel size="tiny">Description</FormLabel>
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
										<FormItem className='space-y-0'>
											<FormLabel size="tiny">Limit Per Member</FormLabel>
											<FormControl>
												<Input type='text' className={cn(InputStyle)} placeholder="Limit" {...field} onChange={(e) => field.onChange(Number(e.currentTarget.value))} />
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
												<Input type='number' className={cn(InputStyle)} placeholder="Limit" {...field} onChange={(e) => field.onChange(Number(e.currentTarget.value))} />
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
											<FormLabel size="tiny">Points</FormLabel>
											<FormControl>
												<Input type='number' className={cn(InputStyle)} placeholder="Reward" {...field}
													onChange={(e) => field.onChange(Number(e.currentTarget.value))} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</SheetSection>
							<SheetSection>
								<RewardImages
									images={reward?.images || []}
									onRemoveImage={(url) => setRemovedImages([...removedImages, url])}
									name='files'
									onFileChange={(files) => setFiles(files)}
								/>
							</SheetSection>
						</form>
					</Form>
				</ScrollArea>
				<SheetFooter className='border-t py-3 px-4 border-foreground/10'>
					<SheetClose asChild>
						<Button variant={'outline'} size={'sm'} onClick={() => setCurrentReward(undefined)}>
							Cancel
						</Button>
					</SheetClose>
					<Button variant={'foreground'} size={'sm'}
						form='reward'
						type='submit'
						onClick={form.handleSubmit(handleSubmit)}
						disabled={loading || !form.formState.isValid}
						className={cn("children:hidden", { "children:block": loading })}
					>
						<Loader2 size={16} className={"animate-spin mr-2"} />
						Save
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	)
}
