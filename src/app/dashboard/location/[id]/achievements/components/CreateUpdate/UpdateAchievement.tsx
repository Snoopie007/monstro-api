"use client";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogClose,
	DialogTrigger,
	Button,
} from "@/components/ui";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tryCatch } from "@/libs/utils";

import { toast } from "react-toastify";
import { AchievementSchema } from "../../schemas";
import { Achievement } from "@subtrees/types";
import { AchievementForm } from "./AchievementForm";
import { useEffect, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { usePermission } from "@/hooks/usePermissions";
import { useAchievements } from "../../providers";

interface UpdateAchievementProps {
	achievement: Achievement;
}

export function UpdateAchievement({ achievement }: UpdateAchievementProps) {
	const [open, setOpen] = useState(false);
	const { achievements, setAchievements } = useAchievements();
	const canEditAchievement = usePermission("edit achievement", achievement.locationId);

	const form = useForm<z.infer<typeof AchievementSchema>>({
		resolver: zodResolver(AchievementSchema),
		defaultValues: {
			name: achievement.name,
			description: achievement?.description ?? "",
			badge: achievement.badge,
			points: achievement.points,
			requiredActionCount: achievement.requiredActionCount,
			triggerId: achievement.triggerId,
			planId: achievement?.planId ?? undefined,
		},
		mode: "onChange",
	});

	useEffect(() => {
		form.reset({
			...achievement,
			planId: achievement?.planId ?? undefined,
		});
	}, [achievement]);

	async function onSubmit(v: z.infer<typeof AchievementSchema>) {
		if (!canEditAchievement || form.formState.isSubmitting) return;

		if (v.triggerId === 3 && v.planId && achievements.some(a => a.planId === v.planId && a.id !== achievement.id)) {
			toast.error("Achievement already exists for this plan");
			return;
		}

		const formData = new FormData();

		Object.entries(v).forEach(([key, value]) => {
			if (key !== "badge" && value !== undefined) {
				formData.append(key, value.toString());
			}
		});

		if (v.badge && v.badge.startsWith("blob:")) {
			const blob = await fetch(v.badge).then((r) => r.blob());
			formData.append("file", blob, "badge.png");
		} else if (v.badge) {
			formData.append("badge", v.badge);
		}

		const lid = achievement.locationId;
		const { result, error } = await tryCatch(
			fetch(`/api/protected/loc/${lid}/achievements/${achievement.id}`, {
				method: "PATCH",
				body: formData,
			})
		);


		if (error || !result || !result.ok) {
			toast.error("Something went wrong, please try again later");
			return;
		}

		const data = await result.json();
		setAchievements((prev) => prev.map(a => a.id === achievement.id ? data : a));
		toast.success("Achievement Updated");
		form.reset();
		setOpen(false);
	}

	function handleOpenChange(open: boolean) {
		if (!open) {
			form.reset();
		}
		setOpen(open);
	}

	if (!canEditAchievement) return null;
	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant={"ghost"} size={"icon"} className="size-8" disabled={!canEditAchievement}>
					<Pencil className="size-3.5" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[540px] sm:w-[540px] p-0 border-foreground/10">
				<DialogHeader>
					<DialogTitle className="text-base font-semibold">Update Achievement</DialogTitle>
				</DialogHeader>
				<AchievementForm lid={achievement.locationId} form={form} />
				<DialogFooter className="border-t border-foreground/10 py-3 px-4 flex gap-2 flex-row-reverse">
					<Button
						onClick={form.handleSubmit(onSubmit)}
						variant={"foreground"}
						size={"sm"}
						disabled={form.formState.isSubmitting}
					>
						{form.formState.isSubmitting ? (
							<Loader2 className="size-3.5 animate-spin" />
						) : (
							"Update"
						)}
					</Button>
					<DialogClose asChild>
						<Button
							variant={"outline"}
							size={"sm"}
							onClick={() => form.reset()}
						>
							Cancel
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
