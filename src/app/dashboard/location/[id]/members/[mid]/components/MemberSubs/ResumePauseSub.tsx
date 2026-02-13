"use client";
import { useMemo, useState } from "react";
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
import { useParams } from "next/navigation";
import { DayFieldPopover } from "./CancelSub/DayFieldPopover";
import { useSession } from "@/hooks/useSession";
import { clientsideApiClient } from "@/libs/api/client";

interface ResumePauseSubProps {
	sub: MemberSubscription;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ResumePauseSub({ sub, open, onOpenChange }: ResumePauseSubProps) {
	const params = useParams();
	const { data: session } = useSession();
	const api = useMemo(() => {
		if (!session?.user?.sbToken) return null;
		return clientsideApiClient(session.user.sbToken);
	}, [session?.user?.sbToken]);
	const [loading, setLoading] = useState(false);
	const [resumeDate, setResumeDate] = useState<string | undefined>(undefined);


	async function toggleStatus() {
		if (!sub?.id || !params?.id || !params?.mid) {
			toast.error("Missing required information");
			return;
		}

		if (!api) {
			toast.error("Session not ready. Please try again.");
			return;
		}

		setLoading(true);
		try {
			if (sub.status === "active") {
				await api.post(`/x/loc/${params.id}/subscriptions/${sub.id}/pause`, {});
				toast.success("Subscription paused");
			} else {
				await api.post(`/x/loc/${params.id}/subscriptions/${sub.id}/resume`, {
					resumeAt: resumeDate,
				});
				toast.success("Subscription resumed");
			}
			onOpenChange(false);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to update subscription";
			toast.error(message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="border-foreground/10">
				<AlertDialogHeader>
					<AlertDialogTitle>{sub.status === "active" ? "Pause Subscription" : "Resume Subscription"}</AlertDialogTitle>
				</AlertDialogHeader>
				<div className="space-y-6">
					<div className=" space-y-4">
						{sub.status === "active" ? (
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
