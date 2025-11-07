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

import { AchievementForm } from "..";
import { useState } from "react";
import { AchievementSchema } from "../../schemas";
import { useForm } from "react-hook-form";
import { useAchievements } from "../../providers";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { tryCatch } from "@/libs/utils";
import { Loader2 } from "lucide-react";
import { usePermission } from "@/hooks/usePermissions";
import { VisuallyHidden } from "@react-aria/visually-hidden";

interface CreateAchievementProps {
	lid: string;
}

export function CreateAchievement({ lid }: CreateAchievementProps) {
	const [open, setOpen] = useState(false);
	const { setAchievements } = useAchievements();

	const canAddAchievement = usePermission("add achievement", lid);
	const form = useForm<z.infer<typeof AchievementSchema>>({
		resolver: zodResolver(AchievementSchema),
		defaultValues: {
			name: "",
			description: "",
			badge: "",
			points: 0,
			requiredActionCount: 0,
		},
		mode: "onChange",
	});

	async function onSubmit(v: z.infer<typeof AchievementSchema>) {
		if (!canAddAchievement) return;
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

		const { result, error } = await tryCatch(
			fetch(`/api/protected/loc/${lid}/achievements`, {
				method: "POST",
				body: formData,
			})
		);

		if (result?.status === 403) {
			toast.error("You are not authorized to create an achievement");
			return;
		}

		if (error || !result || !result.ok) {
			toast.error(error?.message || "Something went wrong, please try again later");
			return;
		}
		const data = await result.json();
		setAchievements((prev) => [...prev, data]);
		form.reset();
		setOpen(false);
	}

	if (!canAddAchievement) return null;
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant={"primary"}>
					+ Achievement
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[540px] sm:w-[540px]  border-foreground/10">
				<VisuallyHidden>
					<DialogTitle></DialogTitle>
				</VisuallyHidden>

				<AchievementForm lid={lid} form={form} />
				<DialogFooter className="p-4  flex flex-row sm:justify-between">
					<DialogClose asChild>
						<Button variant={"outline"} >
							Cancel
						</Button>
					</DialogClose>
					<Button
						variant={"foreground"}
						disabled={form.formState.isSubmitting || !form.formState.isValid}
						onClick={form.handleSubmit(onSubmit)}
					>
						{form.formState.isSubmitting ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							"Create"
						)}
					</Button>

				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
