'use client'
import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogFooter,
	Button,
	ScrollArea,
	DialogTitle
} from '@/components/ui';
import { z } from "zod";
import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Reward } from '@subtrees/types';
import { Form } from '@/components/forms';
import { cn, tryCatch } from '@/libs/utils';
import { toast } from 'react-toastify';
import { RewardsSchema } from '../schemas';
import { RewardImages } from './RewardImages';
import { Loader2, Pencil } from 'lucide-react';
import { VisuallyHidden } from 'react-aria';
import RewardFields from './RewardFields';
import { useRewards } from '../providers';

export interface UpdateRewardProps {
	lid: string,
	reward: Reward,
}

export function UpdateReward({ reward, lid }: UpdateRewardProps) {
	const { setRewards } = useRewards();
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


	async function handleSubmit(v: z.infer<typeof RewardsSchema>) {
		if (!form.formState.isValid) return form.trigger();

		setLoading(true);
		const formData = new FormData();

		// Add form data fields using Object.entries
		Object.entries(v).forEach(([key, value]) => {
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
		if (error || !result || !result.ok) {
			toast.error("Something went wrong, please try again later");
			return;
		}

		const data = await result.json();
		setRewards((prev) => prev.map((r) => (r.id === reward.id ? data : r)));
		setRemovedImages([]);
		setFiles([]);
		toast.success("Reward Updated");
		form.reset();
		setOpen(false);
	};


	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant={'ghost'} size={'icon'} className='size-8'>
					<Pencil className="size-4" />
				</Button>
			</DialogTrigger>
			<DialogContent className="bg-background border-foreground/10 sm:max-w-[550px] sm:w-[550px] p-0">
				<VisuallyHidden>
					<DialogTitle></DialogTitle>
				</VisuallyHidden>
				<ScrollArea className="h-[calc(100vh-400px)] bg-foreground/5 w-full ">
					<Form {...form}>
						<form className='space-y-4 p-4' >
							<RewardFields form={form} />
							<RewardImages
								images={reward?.images || []}
								onRemoveImage={(url) => setRemovedImages([...removedImages, url])}
								name='files'
								onFileChange={(files) => setFiles(files)}
							/>
						</form>
					</Form>
				</ScrollArea>
				<DialogFooter className='p-4  flex flex-row justify-between'>
					<Button variant={'outline'} onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button variant={'primary'}
						type='submit'
						onClick={form.handleSubmit(handleSubmit)}
						disabled={loading || !form.formState.isValid}
					>
						{loading ? <Loader2 className={"animate-spin size-3.5"} /> : 'Save'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}