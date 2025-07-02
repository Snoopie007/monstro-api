'use client'

import {
	Sheet, Button, SheetContent, SheetHeader, SheetTitle,
	SheetFooter, SheetClose,
	SheetTrigger,
} from '@/components/ui';

import { z } from "zod";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tryCatch } from '@/libs/utils';

import { toast } from 'react-toastify';
import { AchievementSchema } from '../schemas';
import { Achievement } from '@/types';
import { AchievementForm } from './AchievementForm';
import { useEffect, useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';


interface UpdateAchievementProps {

	achievement: Achievement;
}


export function UpdateAchievement({ achievement }: UpdateAchievementProps) {

	const [open, setOpen] = useState(false);

	const form = useForm<z.infer<typeof AchievementSchema>>({
		resolver: zodResolver(AchievementSchema),
		defaultValues: {
			name: achievement?.name ?? '',
			description: achievement?.description ?? '',
			badge: achievement?.badge ?? '',
			awardedPoints: achievement?.awardedPoints ?? 0,
			requiredCount: achievement?.requiredCount ?? 0,
		},
		mode: "onChange"
	})

	useEffect(() => {
		form.reset(achievement);
	}, [achievement]);


	async function onSubmit(v: z.infer<typeof AchievementSchema>) {
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

		const lid = achievement.locationId;
		const { result, error } = await tryCatch(
			fetch(`/api/protected/loc/${lid}/achievements/${achievement.id}`, {
				method: 'PATCH',
				body: formData,
			})
		);

		if (error || !result || !result.ok) {
			toast.error("Something went wrong, please try again later");
			return;
		}

		toast.success("Achievement Updated");
		form.reset();
	}

	function handleOpenChange(open: boolean) {
		if (!open) {
			form.reset();
		}
		setOpen(open);
	}

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
			<SheetTrigger asChild>
				<Button variant={"ghost"} size={"icon"} className='size-5'>
					<Pencil className='size-3' />
				</Button>
			</SheetTrigger>
			<SheetContent className="max-w-[40%] bg-background w-[40%] sm:max-w-[540px] sm:w-[540px] p-0 border-foreground/10">
				<SheetHeader className="hidden">
					<SheetTitle className='hidden'>

					</SheetTitle>
				</SheetHeader>
				<AchievementForm form={form} onSubmit={onSubmit} />
				<SheetFooter className='border-t border-foreground/10 py-3 px-4'>
					<SheetClose asChild>
						<Button
							variant={"outline"} size={"sm"}
							onClick={() => form.reset()}
						>
							Close
						</Button>
					</SheetClose>
					<SheetClose asChild>
						<Button
							onClick={form.handleSubmit(onSubmit)}
							variant={"foreground"} size={"sm"}
							disabled={form.formState.isSubmitting}
						>
							{form.formState.isSubmitting ? <Loader2 className='size-4 animate-spin' /> : 'Update'}
						</Button>
					</SheetClose>
				</SheetFooter>
			</SheetContent>
		</Sheet >
	)
}
