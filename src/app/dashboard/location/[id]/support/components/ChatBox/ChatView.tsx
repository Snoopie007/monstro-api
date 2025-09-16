"use client";

import React, { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui";

import { SupportMessage } from "@/types";
import { toast } from "react-toastify";
import { useSupportRealtime } from "../../hooks/useSupportRealtime";
import { useSupport } from "../../providers/SupportProvider";
import { tryCatch } from "@/libs/utils";
import { cn } from "@/components/event-calendar";
import { ChatMessage } from "./ChatMessage";


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
			<div className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="text-lg font-semibold">
							{current.title}
						</div>
						<div className={cn("size-2 rounded-full", current.isVendorActive ? "bg-green-500" : "bg-gray-300")}>

						</div>
					</div>
					<div className="flex items-center gap-2">

					</div>
				</div>

			</div>

			<div className="flex-1 flex flex-col p-0 overflow-hidden">
				{/* Messages Area */}
				<div className="flex-1 min-h-0 overflow-hidden">
					<ScrollArea className="h-full px-4">
						<div className="space-y-4 py-4">
							{messages.map((message) => (
								<ChatMessage key={message.id} message={message} member={current.member} />
							))}
							<div ref={messagesEndRef} />
						</div>
					</ScrollArea>
				</div>

			</div>
		</div>
	);
}
