"use client";

import { useState } from "react";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from "@/components/forms";
import { ArrowUpIcon } from "lucide-react";

interface GroupChatInputProps {
	onSend: (message: string) => Promise<void>;
	disabled?: boolean;
}

export function GroupChatInput({ onSend, disabled = false }: GroupChatInputProps) {
	const [message, setMessage] = useState("");
	const [sending, setSending] = useState(false);

	const handleSend = async () => {
		if (!message.trim() || sending || disabled) return;

		setSending(true);
		try {
			await onSend(message);
			setMessage("");
		} catch (err) {
			console.error('Failed to send message:', err);
		} finally {
			setSending(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	return (
		<div>
			<InputGroup>
				<InputGroupTextarea
					disabled={disabled || sending}
					placeholder={disabled ? "Select a group to start chatting..." : "Type your message here..."}
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					onKeyDown={handleKeyDown}
					rows={2}
				/>
				<InputGroupAddon align="block-end">
					<InputGroupButton
						variant="default"
						className="rounded-full"
						size="icon-xs"
						disabled={disabled || sending || !message.trim()}
						onClick={handleSend}
					>
						<ArrowUpIcon className="size-4" />
						<span className="sr-only">Send</span>
					</InputGroupButton>
				</InputGroupAddon>
			</InputGroup>
		</div>
	);
}
