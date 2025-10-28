"use client";
import {
	Button,
	Dialog,
	DialogContent,
	DialogTitle,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui";
import { Pencil, Trash2, X, Pause, Play, EllipsisVertical } from "lucide-react";
import { MemberSubscription } from "@/types";
import { CancelSub, UpdateSub, PauseSub, ResumeSub } from ".";
import { useState } from "react";
import { cn } from "@/libs/utils";
import { VisuallyHidden } from "react-aria";
import { useMemberSubscriptions } from "@/hooks";

const HoverTransition = "group-hover:bg-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300";

export function SubActions({ sub }: { sub: MemberSubscription }) {
	const [action, setAction] = useState<"cancel" | "update" | "pause" | "resume" | undefined>(
		undefined
	);
	const { fetchSubs } = useMemberSubscriptions(sub.locationId, sub.memberId)
	function handleClose(open: boolean) {
		if (!open) {
			setAction(undefined);
			fetchSubs()
		}
	}


	return (
		<>
			<Dialog open={action !== undefined} onOpenChange={handleClose}>
				<DialogContent className="max-w-lg border-foreground/10 sm:rounded-lg overflow-hidden">
					<VisuallyHidden className="pb-0 pt-5">
						<DialogTitle className="text-sm"></DialogTitle>
					</VisuallyHidden>
					<CancelSub
						sub={sub}
						show={action === "cancel"}
						close={() => handleClose(false)}
					/>
					<UpdateSub
						sub={sub}
						show={action === "update"}
						close={() => handleClose(false)}
					/>
					<PauseSub
						sub={sub}
						show={action === "pause"}
						close={() => handleClose(false)}
					/>
					<ResumeSub
						sub={sub}
						show={action === "resume"}
						close={() => handleClose(false)}
					/>
				</DialogContent>
			</Dialog>
			<div className="flex flex-row items-center group">
				<Button
					variant="ghost"
					size="icon"
					className={cn("size-6 flex-1  rounded-r-none", HoverTransition)}
					onClick={() => setAction("update")}
				>
					<Pencil className="size-3" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className={cn("size-6 border-foreground/5 flex-1", HoverTransition)}
					disabled={!sub}
					onClick={() => {
						if (sub.status === "canceled") return
						setAction("cancel")
					}}
				>
					<X className="size-3.5" />
				</Button>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="size-6 group-hover:bg-foreground/5 flex-1 rounded-l-none"
						>
							<EllipsisVertical className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="border-foreground/10 ">
						<DropdownMenuItem
							className="cursor-pointer text-xs flex flex-row items-center justify-between gap-2"
							onClick={() => setAction("update")}
							disabled={!sub}
						>
							<span > Update</span>
							<Pencil className="size-3" />
						</DropdownMenuItem>
						<DropdownMenuItem
							className="cursor-pointer text-xs flex flex-row items-center justify-between gap-2"
							onClick={() => setAction(sub.status === "active" ? "pause" : "resume")}
							disabled={!sub || !['active', 'paused'].includes(sub.status)}
						>
							<span > {sub.status === "active" ? "Pause" : "Resume"}</span>
							{sub.status === "active" ? <Pause className="size-3" /> : <Play className="size-3" />}
						</DropdownMenuItem>
						<DropdownMenuItem
							className="cursor-pointer text-xs flex flex-row items-center justify-between gap-2"
							onClick={() => setAction("cancel")}
							disabled={!sub}
						>
							<span > Cancel</span>
							<Trash2 className="size-3" />
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</>
	);
}
