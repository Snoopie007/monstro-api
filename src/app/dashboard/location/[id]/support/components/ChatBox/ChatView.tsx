"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button, ScrollArea } from "@/components/ui";

import { SupportMessage } from "@/types";
import { toast } from "react-toastify";
import { useSupportRealtime } from "../../hooks/useSupportRealtime";
import { useSupport } from "../../providers/SupportProvider";
import { tryCatch } from "@/libs/utils";
import { ChatMessage } from "./ChatMessage";
import { MoreHorizontal } from "lucide-react";
import { ChatInput } from "./ChatInput";


export function ChatView({ lid }: { lid: string }) {
	const { current } = useSupport();
	const [messages, setMessages] = useState<SupportMessage[]>([]);

	const { isAiMode } = useSupportRealtime({
		locationId: lid,
		conversationId: current?.id,
		conversation: current || undefined,
	});

	useEffect(() => {
		if (current) {
			setMessages(current.messages || []);
		}
	}, [current]);

	const messagesEndRef = useRef<HTMLDivElement>(null);




	useEffect(() => {
		if (current) {
			getMessages();
		}
	}, [current]);


	async function getMessages() {
		if (!current) return;

		const { result, error } = await tryCatch(
			fetch(`/api/protected/loc/${lid}/support/conversations/${current.id}/messages`)
		);

		if (error || !result || !result.ok) {
			toast.error("Failed to get messages");
			return;
		}

		const data = await result.json();
		console.log(data);
		setMessages(data);
	}


	// const handleNewMessage = (newMessage: SupportMessage) => {
	// 	// Only add message if it's for this conversation
	// 	if (conversation && newMessage.conversationId === conversation.id) {
	// 		const formattedMessage: ConversationMessage = {
	// 			id: newMessage.id,
	// 			content: newMessage.content,
	// 			role: newMessage.role as ConversationMessage["role"],
	// 			timestamp: new Date(newMessage.createdAt),
	// 			metadata: newMessage.metadata,
	// 		};
	// 		setMessages((prev) => [...prev, formattedMessage]);
	// 	}
	// };



	// const handleTakeOverConversation = async () => {
	// 	if (!conversation) return;

	// 	try {
	// 		const response = await fetch(
	// 			`/api/protected/loc/${locationId}/support/conversations/${conversation.id}/takeover`,
	// 			{
	// 				method: "POST",
	// 				headers: {
	// 					"Content-Type": "application/json",
	// 				},
	// 				body: JSON.stringify({
	// 					reason: "Manual takeover by support agent",
	// 					urgency: "medium",
	// 				}),
	// 			}
	// 		);

	// 		if (response.ok) {
	// 			const data = await response.json();
	// 			setIsVendorTakenOver(true);

	// 			// Update current conversation state immediately
	// 			if (currentConversation) {
	// 				setCurrentConversation({
	// 					...currentConversation,
	// 					isVendorActive: true,
	// 				});
	// 			}

	// 			// Add system message
	// 			const systemMessage: ConversationMessage = {
	// 				id: Date.now().toString(),
	// 				content: "A support agent has joined the conversation.",
	// 				role: "system",
	// 				timestamp: new Date(),
	// 			};
	// 			setMessages((prev) => [...prev, systemMessage]);

	// 			// Show success toast
	// 			toast.success("Successfully took over the conversation");
	// 		} else {
	// 			const errorData = await response.json();
	// 			throw new Error(errorData.error || "Failed to take over conversation");
	// 		}
	// 	} catch (error) {
	// 		console.error("Failed to take over conversation:", error);
	// 		const errorMessage =
	// 			error instanceof Error
	// 				? error.message
	// 				: "Failed to take over conversation";
	// 		toast.error(errorMessage);
	// 	}
	// };

	// const handleHandBackToBot = async () => {
	// 	if (!conversation) return;

	// 	try {
	// 		const response = await fetch(
	// 			`/api/protected/loc/${locationId}/support/conversations/${conversation.id}/takeover`,
	// 			{
	// 				method: "DELETE",
	// 				headers: {
	// 					"Content-Type": "application/json",
	// 				},
	// 			}
	// 		);

	// 		if (response.ok) {
	// 			const data = await response.json();
	// 			setIsVendorTakenOver(false);
	// 			setBotSuggestion(null); // Clear any bot suggestions

	// 			// Update current conversation state immediately
	// 			if (currentConversation) {
	// 				setCurrentConversation({
	// 					...currentConversation,
	// 					isVendorActive: false,
	// 				});
	// 			}

	// 			// Add system message
	// 			const systemMessage: ConversationMessage = {
	// 				id: Date.now().toString(),
	// 				content: "The conversation has been handed back to the support bot.",
	// 				role: "system",
	// 				timestamp: new Date(),
	// 			};
	// 			setMessages((prev) => [...prev, systemMessage]);

	// 			// Show success toast
	// 			toast.success("Successfully handed conversation back to bot");
	// 		} else {
	// 			const errorData = await response.json();
	// 			throw new Error(errorData.error || "Failed to hand back conversation");
	// 		}
	// 	} catch (error) {
	// 		console.error("Failed to hand back to bot:", error);
	// 		const errorMessage =
	// 			error instanceof Error
	// 				? error.message
	// 				: "Failed to hand back conversation";
	// 		toast.error(errorMessage);
	// 	}
	// };





	if (!current) {
		return (
			<div className="text-center">

				<p className="text-lg font-medium text-muted-foreground mb-2">
					No Conversation Selected
				</p>

			</div>
		);
	}

	return (
		<div className="h-full flex flex-col">
			{current && (
				<div className='flex flex-row gap-2 items-center justify-between border-b border-foreground/5 p-4'>
					<div className='flex flex-col '>
						<span className='text-sm font-bold'>
							{current.title}
						</span>

					</div>
					<div className='flex flex-row gap-1 items-center'>
						<Button variant="outline" size="icon" className='size-8 rounded-lg border-foreground/10' >
							<MoreHorizontal className="size-4" />
						</Button>

					</div>
				</div>
			)}

			<div className='flex flex-col h-full flex-1  overflow-hidden'>
				<div className='relative h-full flex flex-col'>
					<ScrollArea className="h-full px-4">
						<div className="space-y-4 py-4">
							{messages.map((message) => (
								<ChatMessage key={message.id} message={message} member={current.member} />
							))}
							<div ref={messagesEndRef} />
						</div>
					</ScrollArea>
					<ChatInput lid={lid} />
				</div>

			</div>
		</div>
	);
}
