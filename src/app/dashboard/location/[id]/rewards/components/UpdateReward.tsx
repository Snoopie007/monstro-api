import { Sheet, SheetContent, SheetTitle, SheetFooter, SheetClose, Button, ScrollArea, SheetSection, SheetTrigger } from '@/components/ui';
import { z } from "zod";
import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Reward } from '@/types';
import {
	Form
} from '@/components/forms';
import { cn, tryCatch } from '@/libs/utils';
import { toast } from 'react-toastify';
import useSWR from 'swr';
import { RewardsSchema } from '../schemas';
import { RewardImages } from './RewardImages';
import { Loader2, Pencil } from 'lucide-react';
import { VisuallyHidden } from 'react-aria';
import RewardFields from './RewardFields';
import { useRewards } from '@/hooks/useRewards';


export interface UpdateRewardProps {
	lid: string,
	reward: Reward,
}

export function UpdateReward({ reward, lid }: UpdateRewardProps) {
	const { mutate } = useRewards(lid);
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
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
			fetch(`/api/protected/loc/${lid}/rewards/${reward.id}`, {
				method: 'PATCH',
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

	};


	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button variant={'ghost'} size={'icon'} className='size-5'>
					<Pencil size={12} className="size-3.5" />
				</Button>
			</SheetTrigger>
			<SheetContent className="bg-background border-foreground/10 sm:max-w-[550px] sm:w-[550px] p-0">
				<VisuallyHidden>
					<SheetTitle></SheetTitle>
				</VisuallyHidden>
				<ScrollArea className="h-[calc(100vh-150px)] w-full ">
					<Form {...form}>
						<form >
							<RewardFields form={form} />

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
						<Button variant={'outline'} size={'sm'} >
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