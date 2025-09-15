"use client";

import React, { useMemo, useState } from "react";
import {
	Button,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
	Badge,
	Avatar,
	AvatarImage,
	AvatarFallback,
	ScrollArea,
	Skeleton,
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from "@/components/ui";
import { Input } from "@/components/forms";
import {
	RefreshCw,
	MoreHorizontal,
} from "lucide-react";
import { SupportConversation, SupportConversationStatus } from "@/types/";
import { BotConfig } from "./BotConfig";

import { formatDistance } from "date-fns";
import { useSupport } from "../providers";
import { cn } from "@/libs/utils";


export function SupportList({ lid }: { lid: string }) {

	const { conversations, current } = useSupport();
	const [status, setStatus] = useState<SupportConversationStatus>("open");
	const [search, setSearch] = useState<string>("");

	const isLoading = useMemo(() => {
		return !conversations;
	}, [conversations]);


	const byStatus = useMemo(() => {
		if (!conversations) return [];
		const open = conversations?.filter((c) => c.status === 'open');
		const resolved = conversations?.filter((c) => c.status === 'resolved');
		return [
			{ status: 'open', count: open.length },
			{ status: 'resolved', count: resolved.length },
		]
	}, [conversations, status]);

	const filteredConversations = useMemo(() => {
		if (!conversations) return [];

		return conversations.filter(c => {
			if (search) {
				const name = `${c.member?.firstName} ${c.member?.lastName}`.toLowerCase();
				const email = c.member?.email?.toLowerCase() || '';
				const searchTerm = search.toLowerCase();
				return name.includes(searchTerm) || email.includes(searchTerm);
			}
			return c.status === status;
		});
	}, [conversations, status, search]);


	async function refreshConversations() {
		await fetch(`/api/protected/loc/${lid}/support/conversations`);
	}


	const isSelected = (cid: string) => useMemo(() => {
		return current?.id === cid;
	}, [current]);

	return (
		<div className='flex flex-col'>
			<div className="flex items-center justify-between p-2">
				<div className="text-base font-bold">
					Support Inbox
				</div>
				<div className="flex items-center gap-1">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="ghost" size="icon" className="size-8"
									onClick={() => { }}
									disabled={isLoading}
								>
									<RefreshCw
										size={16}
										className={isLoading ? "animate-spin" : ""}
									/>
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Refresh</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<BotConfig lid={lid} />
							</TooltipTrigger>
							<TooltipContent>
								<p>Configure bot</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>

			</div>

			<div className="flex-col flex-1 space-y-2 ">
				<div className="space-y-4 px-2">
					<Input placeholder="Search" className="rounded-lg w-full bg-foreground/5 border-none" />
					<div className="flex flex-row gap-2 items-center">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" className=" h-auto rounded-full font-semibold  bg-foreground/5 px-3 py-1 text-xs text-center">
									{byStatus.find((s) => s.status === status)?.count} {status}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start" className="capitalize">
								{byStatus.map((s) => (
									<DropdownMenuItem key={s.status} onClick={() => setStatus(s.status as SupportConversationStatus)} className="cursor-pointer">
										{s.count} {s.status}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
				{isLoading && (
					<div className="flex flex-col gap-2 p-2">
						<Skeleton className="h-10 w-full rounded-md" />
						<Skeleton className="h-10 w-full rounded-md" />
						<Skeleton className="h-10 w-full rounded-md" />
					</div>
				)}

				{!isLoading && (
					<ScrollArea className="px-2">
						{filteredConversations.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">

								<p>No conversations yet</p>
							</div>
						) : (
							<div className="space-y-2">
								{filteredConversations.map((conversation) => (
									<ConversationItem
										key={conversation.id}
										conversation={conversation}
										isSelected={isSelected(conversation.id)}
									/>
								))}
							</div>
						)}
					</ScrollArea>
				)}
			</div>
		</div>
	);
}
interface ConversationItemProps {
	conversation: SupportConversation;
	isSelected: boolean;
}
function ConversationItem({
	conversation,
	isSelected,
}: ConversationItemProps) {
	const { setCurrent } = useSupport();
	const { member } = conversation;
	return (
		<li key={conversation.id}
			onClick={() => setCurrent(conversation)}
			className={cn("px-4 py-3 hover:bg-foreground/5 cursor-pointer rounded-lg flex flex-row items-center gap-2 ", {
				"bg-foreground/5": isSelected,
			})}
		>
			<Avatar className="size-10">
				<AvatarImage src={member?.avatar || ""} />
				<AvatarFallback className='bg-foreground/10 text-foreground/50 font-bold'>
					{member?.firstName?.charAt(0) || "?"}
				</AvatarFallback>
			</Avatar>
			<div className="flex flex-row flex-1 justify-between items-center">
				<div className="space-y-0 w-full" >
					<div className="text-sm  flex flex-row gap-2 justify-between items-center w-full">
						<span className="font-medium flex flex-row gap-1 items-center justify-between w-full">
							<div className="flex flex-row gap-1 items-center">
								<span> {conversation.member?.firstName} {conversation.member?.lastName}</span>
								<Badge
									variant="outline"
									size="tiny"
									className={cn("rounded-lg font-bold",
										{
											"bg-green-50 text-green-700 border-green-200": !conversation.isVendorActive,
										}
									)}
								>

									{conversation.isVendorActive ? "Human" : "Bot"}
								</Badge>
							</div>
							<div className="flex flex-row gap-1 items-center">
								<Button variant="ghost" size="icon" className='size-4 text-muted-foreground hover:bg-transparent hover:text-foreground'>
									<MoreHorizontal className="size-4" />
								</Button>
							</div>
						</span>
					</div>
					<div className="text-[0.7rem] text-muted-foreground flex flex-row gap-2 justify-between items-center">
						<div className="flex flex-row gap-1 items-center">

							<span>{conversation.title || "No title"}</span>
						</div>
						<span className=" text-muted-foreground">
							{formatDistance(conversation.created, new Date(), { addSuffix: true })}
						</span>
					</div>
				</div>
			</div>
		</li>
	)
}