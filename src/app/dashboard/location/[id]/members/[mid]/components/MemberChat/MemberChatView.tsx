"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useChat } from "@/hooks/useChat";
import { useSession } from "@/hooks/useSession";
import {
	Avatar, AvatarFallback, AvatarImage,
	ScrollArea,
	Badge,
} from "@/components/ui/";
import { Loader2 } from "lucide-react";
import { Member } from "@subtrees/types";
import { formatMessageTimestamp, getDateLabel, isGroupedMessage } from "@/libs/utils";
import { isSameDay } from "date-fns";
import ReactMarkdown from "react-markdown";
import { GroupChatInput } from "../../../../groups/components/GroupChatInput";
import { ChatReactions, ChatReactionSheet } from "../../../../groups/components/reactions";
import { UploadingMessage } from "../../../../groups/components/UploadingMessage";
import { MessageMedia } from "../../../../groups/components/MessageMedia";
import { Message } from "@subtrees/types";

interface MemberChatViewProps {
	locationId: string;
	currentMemberId: string; // The member page we're viewing
	currentMember: Member;
}


export function MemberChatView({ locationId, currentMemberId, currentMember }: MemberChatViewProps) {
	const { data: session } = useSession();
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const fromUserId = session?.user?.id || null;
	const toUserId = currentMember?.userId || null;

	// Use the chat hook with user IDs
	const {
		messages,
		isConnected,
		isLoading,
		chatId,
		error,
		sendMessage,
		toggleReaction
	} = useChat({
		mode: fromUserId && toUserId && locationId 
			? { type: 'social', fromUserId, toUserId, locationId } 
			: null,
		enabled: !!fromUserId && !!toUserId && fromUserId !== toUserId,
	});

	// State for reaction picker
	const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
	const [selectedMessageForReaction, setSelectedMessageForReaction] = useState<Message | null>(null);

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const handleSendMessage = async (content: string, files: File[]) => {
		if (!content.trim() && files.length === 0) return;

		try {
			await sendMessage(content, files);
		} catch (err) {
			console.error('Failed to send message:', err);
		}
	};

	const handleOpenReactionPicker = useCallback((message: Message) => {
		setSelectedMessageForReaction(message);
		setReactionPickerOpen(true);
	}, []);

	const handleToggleReaction = useCallback(async (
		messageId: string,
		emoji: { value: string; name: string; type: string }
	) => {
		try {
			await toggleReaction(messageId, emoji);
		} catch (err) {
			console.error('Failed to toggle reaction:', err);
		}
	}, [toggleReaction]);

	const handleReactionSelect = useCallback((emoji: { value: string; name: string; type: string }) => {
		if (selectedMessageForReaction && session?.user?.id) {
			handleToggleReaction(selectedMessageForReaction.id, emoji);
		}
		setReactionPickerOpen(false);
		setSelectedMessageForReaction(null);
	}, [selectedMessageForReaction, session?.user?.id, handleToggleReaction]);

	const canChat = fromUserId && toUserId && fromUserId !== toUserId;
	const currentMemberName = `${currentMember?.firstName ?? ""} ${currentMember?.lastName ?? ""}`.trim() || "Member";
	const currentMemberAvatar = currentMember?.user?.image || undefined;
	const currentMemberInitials = `${currentMember?.firstName?.[0] ?? ""}${currentMember?.lastName?.[0] ?? ""}`.trim() || "?";

	return (
		<div className="bg-muted/50 rounded-lg flex-1 h-full flex flex-col min-h-0 overflow-hidden">
			<div className="flex flex-col gap-2 border-b border-foreground/5 p-4 flex-shrink-0">
				<div className="flex flex-row items-center justify-between">
					<div className="flex flex-row items-center gap-2">
						<span className="text-sm font-bold">Chat with {currentMemberName}</span>
						{isConnected && (
							<Badge variant="outline" className="text-xs">
								<span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
							</Badge>
						)}
						{error && (
							<Badge variant="destructive" className="text-xs">
								{error}
							</Badge>
						)}
					</div>
				</div>
			</div>

			<div className="flex-1 relative min-h-0">
				<div className="absolute inset-0 flex flex-col">
					{!canChat ? (
						<div className="h-full flex items-center justify-center text-center px-4">
							<div className="space-y-2">
								<span className="text-sm text-muted-foreground block">
									{!fromUserId
										? "You must be logged in to chat"
										: !toUserId
											? "This member cannot be reached right now"
											: "Cannot chat with yourself"}
								</span>
							</div>
						</div>
					) : isLoading ? (
						<div className="h-full flex items-center justify-center">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : (
						<>
						<ScrollArea className="flex-1 w-full px-4">
							<div className="space-y-1 py-4">
									{messages.length === 0 ? (
										<div className="text-center text-sm text-muted-foreground py-8">
											Send a message to start the conversation
										</div>
									) : (
										messages.map((message, index) => {
										const isFromCurrentUser = message.senderId === fromUserId;
										const isFromMember = message.senderId === toUserId;

										let displayName: string;
										let avatarSrc: string | undefined;
										let fallbackInitials: string;

										if (message.isOptimistic && message.sender) {
											displayName = message.sender.name ?? "You";
											avatarSrc = message.sender.image ?? undefined;
											fallbackInitials = displayName.charAt(0) ?? "?";
										} else if (isFromMember) {
											displayName = currentMemberName;
											avatarSrc = currentMemberAvatar;
											fallbackInitials = currentMemberInitials;
										} else if (isFromCurrentUser) {
											displayName = session?.user?.name ?? "You";
											avatarSrc = session?.user?.image ?? undefined;
											fallbackInitials = displayName.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() || "?";
										} else {
											displayName = "Staff";
											avatarSrc = undefined;
											fallbackInitials = "S";
										}

										const prevMessage = messages[index - 1];
										const nextMessage = messages[index + 1];
										const isNewDay = !prevMessage || !isSameDay(new Date(prevMessage.created), new Date(message.created));
										const isGrouped = isGroupedMessage(message, prevMessage);
										const isGroupedWithNext = isGroupedMessage(nextMessage, message);

										return (
											<div key={message.id} className={!isGroupedWithNext ? 'mb-4' : ''}>
												{isNewDay && message.created && (
													<div className="relative flex items-center justify-center my-6">
														<div className="absolute inset-0 flex items-center">
															<span className="w-full border-t border-muted-foreground/20" />
														</div>
														<span className="relative bg-muted px-2 text-xs text-muted-foreground rounded-full">
															{getDateLabel(new Date(message.created))}
														</span>
													</div>
												)}
										<div className={`flex gap-3 flex-row group ${
											isGrouped ? 'py-0.5' : 'py-2'
										}`}>
											{!isGrouped ? (
												<Avatar className="h-8 w-8 flex-shrink-0">
													<AvatarImage src={avatarSrc} />
													<AvatarFallback className="text-xs">
														{fallbackInitials || "?"}
													</AvatarFallback>
												</Avatar>
											) : (
												<div className="w-8 flex-shrink-0" />
											)}
											<div className="flex flex-col gap-0.5 flex-1 min-w-0">
												{!isGrouped && (
													<div className="flex flex-row items-center gap-2">
														<span className="text-xs text-muted-foreground">
															{isFromCurrentUser ? "You" : displayName}
														</span>
														<span className="text-xs text-muted-foreground/60">
															{message.created ? formatMessageTimestamp(message.created) : "Unknown time"}
														</span>
													</div>
												)}
												{message.isOptimistic && message.pendingFiles ? (
													<>
														{message.content && (
															<div className="text-sm prose prose-sm prose-invert max-w-none leading-relaxed">
																<ReactMarkdown>
																	{message.content}
																</ReactMarkdown>
															</div>
														)}
														<UploadingMessage
															progress={message.progress ?? 0}
															files={message.pendingFiles}
														/>
													</>
												) : (
													<>
														<div className="text-sm prose prose-sm prose-invert max-w-none leading-relaxed">
															<ReactMarkdown>
																{message.content}
															</ReactMarkdown>
														</div>
														<MessageMedia media={message.medias || []} />
														{/* Show existing reactions below message */}
														{message.reactions && message.reactions.length > 0 && (
															<ChatReactions
																reactions={message.reactions}
																currentUserId={session?.user?.id}
																onToggleReaction={(emoji: { value: string; name: string; type: string }) => handleToggleReaction(message.id, emoji)}
																onOpenPicker={() => handleOpenReactionPicker(message as Message)}
															/>
														)}
													</>
												)}
											</div>
											{/* Actions toolbar - right side, shows on hover */}
											{!message.isOptimistic && (!message.reactions || message.reactions.length === 0) && (
												<div className="flex items-center gap-1 ml-auto flex-shrink-0 self-start opacity-0 group-hover:opacity-100 transition-opacity">
													<ChatReactions
														reactions={[]}
														currentUserId={session?.user?.id}
														onToggleReaction={(emoji: { value: string; name: string; type: string }) => handleToggleReaction(message.id, emoji)}
														onOpenPicker={() => handleOpenReactionPicker(message as Message)}
													/>
												</div>
											)}
										</div>
												</div>
											);
										})
									)}
									<div ref={messagesEndRef} />
								</div>
							</ScrollArea>
							<div className="flex-shrink-0 p-4">
								<GroupChatInput onSend={handleSendMessage} disabled={isLoading || !isConnected} />
							</div>
						</>
					)}
				</div>
			</div>

			{/* Reaction Picker Sheet */}
			<ChatReactionSheet
				open={reactionPickerOpen}
				onOpenChange={(open: boolean) => {
					setReactionPickerOpen(open);
					if (!open) setSelectedMessageForReaction(null);
				}}
				onSelect={handleReactionSelect}
			/>
		</div>
	);
}
