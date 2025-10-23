"use client";

import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupText,
	InputGroupTextarea,
} from "@/components/forms";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	Separator,
} from "@/components/ui";
import { ArrowUpIcon, Plus } from "lucide-react";

export function MemberChatInput() {
	return (
		<div>
			{/* TODO: Disabled for now since chat isn't implemented yet */}
			<InputGroup>
				<InputGroupTextarea disabled placeholder="Type your message here..." />
				<InputGroupAddon align="block-end">
					<InputGroupButton
						variant="ghost"
						disabled
						className="rounded-full bg-foreground/10"
						size="icon-xs"
					>
						<Plus className="size-4" />
					</InputGroupButton>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<InputGroupButton
								variant="ghost"
								disabled
								className=" text-xs rounded-lg bg-foreground/10"
							>
								Auto
							</InputGroupButton>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							side="top"
							align="start"
							className="[--radius:0.95rem]"
						>
							{["Auto", "Agent", "Manual"].map((item) => (
								<DropdownMenuItem key={item}>{item}</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
					<InputGroupText className="ml-auto">0% used</InputGroupText>
					<Separator orientation="vertical" className="!h-4 bg-foreground/10" />
					<InputGroupButton
						variant="default"
						className="rounded-full"
						size="icon-xs"
						disabled
					>
						<ArrowUpIcon className="size-4" />
						<span className="sr-only">Send</span>
					</InputGroupButton>
				</InputGroupAddon>
			</InputGroup>
		</div>
	);
}
