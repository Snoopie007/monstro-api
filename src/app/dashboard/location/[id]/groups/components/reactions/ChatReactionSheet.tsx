"use client";

import { Button, ScrollArea } from "@/components/ui";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { CHAT_QUICK_REACTIONS, EMOJI_CATEGORIES, toEmojiData } from "@/constants/emojis";
import { cn } from "@/libs/utils";
import { ReactionEmoji } from "@subtrees/types/reactions";
import { X } from "lucide-react";

type ChatReactionSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelect: (emoji: ReactionEmoji) => void;
};

export function ChatReactionSheet({
	open,
	onOpenChange,
	onSelect,
}: ChatReactionSheetProps) {
	const handleSelect = (display: string, name: string) => {
		onSelect(toEmojiData(display, name));
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md h-[80vh] flex flex-col p-0 gap-0">
				<DialogHeader className="px-4 py-3 border-b border-foreground/5 flex-shrink-0">
					<div className="flex items-center justify-between">
						<DialogTitle className="text-base font-semibold">
						</DialogTitle>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							onClick={() => onOpenChange(false)}
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
				</DialogHeader>

				{/* Quick Reactions - Fixed at top */}
				<div className="px-4 py-3 border-b border-foreground/5 flex-shrink-0">
					<p className="text-xs font-medium text-muted-foreground mb-2">
						Quick Reactions
					</p>
					<div className="flex flex-wrap gap-1">
						{CHAT_QUICK_REACTIONS.map((emoji) => (
							<button
								key={emoji.name}
								onClick={() => handleSelect(emoji.display, emoji.name)}
								className={cn(
									"w-10 h-10 flex items-center justify-center rounded-lg",
									"hover:bg-accent hover:scale-110 transition-all duration-150",
									"text-2xl"
								)}
								title={emoji.name}
							>
								{emoji.display}
							</button>
						))}
					</div>
				</div>

				{/* Scrollable Categories */}
				<ScrollArea className="flex-1">
					<div className="px-4 py-2">
						{EMOJI_CATEGORIES.filter(cat => cat.name !== 'Quick Reactions').map((category) => (
							<div key={category.name} className="mb-4">
								<p className="text-xs font-medium text-muted-foreground mb-2 sticky top-0 bg-background py-1">
									{category.name}
								</p>
								<div className="flex flex-wrap gap-0.5">
									{category.emojis.map((emoji, index) => (
										<button
											key={`${category.name}-${index}`}
											onClick={() => handleSelect(emoji.display, emoji.name)}
											className={cn(
												"w-9 h-9 flex items-center justify-center rounded-md",
												"hover:bg-accent hover:scale-125 transition-all duration-150",
												"text-xl"
											)}
											title={emoji.name}
										>
											{emoji.display}
										</button>
									))}
								</div>
							</div>
						))}
					</div>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}

