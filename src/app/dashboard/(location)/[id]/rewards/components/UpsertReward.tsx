
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

const InputStyle = "border bg-transparent w-full rounded-[4px] text-sm text-white py-2 px-4 border-white h-auto  font-roboto";

export interface AddrewardProps {
	reward: Reward | undefined,
	locationId: string,
	setCurrentReward: Dispatch<SetStateAction<Reward | undefined>>

}

export function UpsertReward({ reward, locationId, setCurrentReward }: AddrewardProps) {

	const { mutate } = useSWR(`/api/protected/${locationId}/rewards`);
	const [loading, setLoading] = useState(false);
	const [removedImages, setRemovedImages] = useState<string[]>([]);
	const form = useForm<z.infer<typeof RewardsSchema>>({
		resolver: zodResolver(RewardsSchema),
		defaultValues: {
			name: reward?.name || '',
			description: reward?.description || '',
			requiredPoints: reward?.requiredPoints || 0,
			totalLimit: reward?.totalLimit || 0,
			limitPerMember: reward?.limitPerMember || 0,
		},
		mode: "onSubmit",
	})

	useEffect(() => {
		if (reward) {
			form.reset(reward);
		}
	}, [reward]);


	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();


		if (!form.formState.isValid) return form.trigger();

		setLoading(true);
		const formData = new FormData(e.currentTarget);
		const files = formData.get('files') || formData.getAll('files');
		if (!files || (Array.isArray(files) && files.length === 0)) {
			toast.error("Please upload at least one image");
			setLoading(false);
			return;
		}

		if (removedImages.length > 0) {
			for (const image of removedImages) {
				formData.append('removedImages', image);
			}
		}

		if (reward?.images) {
			for (const image of reward.images) {
				formData.append('images', image);
			}
		}

		try {

			const { result, error } = await tryCatch(
				fetch(`/api/protected/loc/${locationId}/rewards${reward?.id ? `/${reward.id}` : ''}`, {
					method: reward?.id ? 'PUT' : 'POST',
					body: formData,
				})
			)
			console.log(result, error);
			setLoading(false);
			// if (error || !result) {
			// 	toast.error("Something went wrong, please try again later");
			// 	return;
			// }

			// await mutate();
			// toast.success("Reward Updated");
			// form.reset();
			// setCurrentReward(undefined);
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

					<SheetTitle className='text-sm font-semibold'>{reward?.id ? "Update Reward" : "Create Reward"}</SheetTitle>
				</SheetHeader>
				<ScrollArea className="h-[calc(100vh-150px)] w-full ">
					<Form {...form}>
						<form onSubmit={submit} id='reward' >
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
												<FormItem className='space-y-0'>

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
												<FormItem className='space-y-0'>
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
												<FormItem className='space-y-0'>
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
										<FormLabel>Limit Total(Leaving it empty will set it to unlimited)</FormLabel>
									</SheetFieldLabel>
									<SheetFieldInput>
										<FormField
											control={form.control}
											name="totalLimit"
											render={({ field }) => (
												<FormItem className='space-y-0'>
													<FormControl>
														<Input type='text' className={cn(InputStyle)} placeholder="Limit" {...field} onChange={(e) => field.onChange(e.currentTarget.value)} />
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
												<FormItem className='space-y-0'>

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
									images={reward?.images || []}
									onRemoveImage={(url) => setRemovedImages([...removedImages, url])}
									name='files'
								/>
							</SheetSection>



						</form>
					</Form>
				</ScrollArea>
				<SheetFooter className='border-t py-3 px-4'>
					<SheetClose asChild>
						<Button variant={'outline'} size={'sm'} onClick={() => setCurrentReward(undefined)}>
							Cancel
						</Button>
					</SheetClose>
					<Button variant={'foreground'} size={'sm'}
						form='reward'
						type='submit'
						disabled={loading || !form.formState.isValid}
						className={cn("children:hidden", { "children:block": loading })}
					>
						<Loader2 size={16} className={"animate-spin mr-2"} />
						Save
					</Button>
				</SheetFooter>


			</SheetContent >
		</Sheet >
	)
}
