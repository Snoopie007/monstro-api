"use client";
import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	ButtonGroup,
} from "@/components/ui";
import { Pencil, Trash2, X, Pause, Play, EllipsisVertical } from "lucide-react";
import { MemberSubscription } from "@/types";

import { useState } from "react";
import { cn } from "@/libs/utils";
import { useMemberSubscriptions } from "@/hooks";
import { ResumePauseSub } from "./ResumePauseSub";
import { UpdateSub } from "./UpdateSub";
import { CancelSub } from "./CancelSub";
const HoverTransition = "group-hover:bg-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300";
const ItemBtnStyle = "cursor-pointer text-xs flex flex-row items-center justify-between gap-2 ";


export function SubActions({ sub }: { sub: MemberSubscription }) {
	const { mutate } = useMemberSubscriptions(sub.locationId, sub.memberId)
	const [openCancel, setOpenCancel] = useState(false);
	const [openUpdate, setOpenUpdate] = useState(false);
	const [openRPSub, setOpenRPSub] = useState(false);







	return (
		<>
			<UpdateSub sub={sub} open={openUpdate} onOpenChange={setOpenUpdate} />
			<CancelSub sub={sub} open={openCancel} onOpenChange={setOpenCancel} />
			<ResumePauseSub sub={sub} open={openRPSub} onOpenChange={setOpenRPSub} />
			<ButtonGroup className=" group">
				<Button
					variant="ghost"
					size="icon"
					className={cn("size-6", HoverTransition)}
					onClick={() => setOpenUpdate(true)}
				>
					<Pencil className="size-3" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className={cn("size-6 border-foreground/5 ", HoverTransition)}
					disabled={!sub}
					onClick={() => setOpenCancel(true)}
				>
					<X className="size-3.5" />
				</Button>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="size-6 group-hover:bg-foreground/5"
						>
							<EllipsisVertical className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="border-foreground/10 ">
						<DropdownMenuItem
							className={ItemBtnStyle}
							onClick={() => setOpenUpdate(true)}
							disabled={!sub}
						>
							<span > Update</span>
							<Pencil className="size-3" />
						</DropdownMenuItem>
						<DropdownMenuItem
							className={ItemBtnStyle}
							onClick={() => setOpenRPSub(true)}
							disabled={!sub || !['active', 'paused'].includes(sub.status)}
						>
							<span > {sub.status === "active" ? "Pause" : "Resume"}</span>
							{sub.status === "active" ? <Pause className="size-3" /> : <Play className="size-3" />}
						</DropdownMenuItem>
						<DropdownMenuItem
							className={ItemBtnStyle}
							onClick={() => setOpenCancel(true)}
							disabled={!sub}
						>
							<span > Cancel</span>
							<Trash2 className="size-3" />
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</ButtonGroup>
		</>
	);
}
