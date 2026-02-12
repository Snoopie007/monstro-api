"use client";
import React, { useState } from "react";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogFooter,
	AlertDialogCancel,

	Button,
	AlertDialogAction,
} from "@/components/ui";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { MemberSubscription } from "@subtrees/types/member";
import { cn, tryCatch } from "@/libs/utils";
import { useParams } from "next/navigation";
import { DayFieldPopover } from "./CancelSub/DayFieldPopover";

interface ResumePauseSubProps {
	sub: MemberSubscription;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ResumePauseSub({ sub, open, onOpenChange }: ResumePauseSubProps) {
	const params = useParams();
	const [loading, setLoading] = useState(false);
	const [resumeDate, setResumeDate] = useState<string | undefined>(undefined);


	async function toggleStatus() {
		if (!sub?.id || !params?.id || !params?.mid) {
			toast.error("Missing required information");
			return;
		}

		setLoading(true);
		const { result, error } = await tryCatch(
			fetch(`/api/protected/loc/${params.id}/members/${params.mid}/subs/${sub.id}`, {
				method: "PATCH",
				body: JSON.stringify({ resumeDate, pause: true }),
			})
		);

		setLoading(false);

		if (error || !result || !result.ok) {
			const errorData = await result?.json();
			toast.error(errorData.error || "Failed to pause subscription");
			return;
		}

		toast.success("Subscription paused");
		onOpenChange(false);
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="border-foreground/10">
				<AlertDialogHeader>
					<AlertDialogTitle>{sub.status === "active" ? "Pause Subscription" : "Resume Subscription"}</AlertDialogTitle>
				</AlertDialogHeader>
				<div className="space-y-6">
					<div className=" space-y-4">
						{sub.status == "active" ? (
							<>


								<p className="text-sm  text-foreground/70  leading-relaxed bg-foreground/5 rounded-md p-2">
									This will pause the collection of payments for this subscription.
									But does not cancel or change the subscription end date if there is one.
									You may also specify a date to resume the subscription automatically for subscriptions that
									are not cash only.
								</p>

								<div className="flex flex-col items-start space-y-1">
									<div className="text-[0.65rem] uppercase ">Pause Until</div>
									<DayFieldPopover value={resumeDate} onChange={setResumeDate} />
								</div>
							</>

						) : (
							<>

								<p className="text-sm  text-foreground/70  leading-relaxed bg-foreground/5 rounded-md p-2">
									This will resume the collection of payments for this subscription starting today.
								</p>
							</>
						)}
					</div>



				</div>
				<AlertDialogFooter className="bg-transparent sm:justify-between">
					<AlertDialogCancel asChild>
						<Button
							variant="outline"

							className="border-foreground/10"
							disabled={loading}
						>
							Don't pause
						</Button>
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={toggleStatus}
						disabled={loading}
					>
						{loading ? <Loader2 className="size-4 animate-spin" /> : "Confirm"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
