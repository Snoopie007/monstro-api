"use client";
import { MemberChatInput } from "./MemberChatInput";

export function MemberChatView() {
	return (
		<div className="bg-muted/50 rounded-lg flex-1 h-full flex flex-col min-h-0">
			<div className="flex flex-row gap-2 items-center justify-between border-b border-foreground/5 p-4 flex-shrink-0">
				<div className="flex flex-row items-center gap-2">
					{/* <PulsingStatus live={false} />
					<span className="text-sm font-bold">Member Chat</span> */}
				</div>
			</div>

			<div className="flex flex-col flex-1 min-h-0 overflow-hidden">
				{/* <ScrollArea className="flex-1 h-full px-4">
					
				</ScrollArea> */}

				<div className="h-full flex items-center justify-center text-center">
					{/* no chat feature yet */}
					<span className="text-sm text-muted-foreground">
						Stay tuned! This feature is coming soon.
					</span>
				</div>
				<div className="flex-shrink-0 p-4">
					<MemberChatInput />
				</div>
			</div>
		</div>
	);
}
