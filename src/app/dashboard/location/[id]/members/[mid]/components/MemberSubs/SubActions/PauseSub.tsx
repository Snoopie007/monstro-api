"use client";
import React, { useState } from "react";
import {
	DialogFooter,
	Button,
	DialogClose,
} from "@/components/ui";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { MemberSubscription } from "@/types/member";
import { cn, tryCatch } from "@/libs/utils";
import { useParams } from "next/navigation";
import { DayFieldPopover } from "./DayFieldPopover";
import { FormLabel } from "@/components/forms";

interface PauseSubProps {
	sub: MemberSubscription;
	show: boolean;
	close: () => void;
}

export function PauseSub({ sub, show, close }: PauseSubProps) {
	const params = useParams();
	const [loading, setLoading] = useState(false);
	const [resumeDate, setResumeDate] = useState<string | undefined>(undefined);


	const handleSubmit = async () => {
		if (!sub?.id || !params?.id || !params?.mid) {
			toast.error("Missing required information");
			return;
		}

		setLoading(true);
		const { result, error } = await tryCatch(
			fetch(`/api/protected/loc/${params.id}/members/${params.mid}/subs/${sub.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
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
		close();
	};

	return (
		<div className={cn(show ? "block" : "hidden")}>
			<div className="p-4 pt-6 space-y-4">
				<div className="text-lg font-semibold">Pause Subscription</div>
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
			</div>

			<DialogFooter className="bg-transparent sm:justify-between">
				<DialogClose asChild>
					<Button
						variant="foreground"
						size="sm"
						className="border-foreground/10"
						disabled={loading}
					>
						Don't pause
					</Button>
				</DialogClose>
				<Button
					variant="continue"
					size="sm"
					onClick={handleSubmit}
					disabled={loading}
				>
					{loading ? (
						<>
							<Loader2 className="mr-2 size-4 animate-spin" />
						</>
					) : (
						"Confirm"
					)}
				</Button>
			</DialogFooter>
		</div>
	);
}
