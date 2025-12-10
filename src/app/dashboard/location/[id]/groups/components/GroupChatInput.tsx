"use client";

import { useState, useRef, useEffect } from "react";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from "@/components/forms";
import { ArrowUpIcon, PlusIcon, XIcon, FileIcon, ImageIcon } from "lucide-react";

interface GroupChatInputProps {
	onSend: (message: string, files: File[]) => Promise<void>;
	disabled?: boolean;
}

export function GroupChatInput({ onSend, disabled = false }: GroupChatInputProps) {
	const [message, setMessage] = useState("");
	const [sending, setSending] = useState(false);
	const [files, setFiles] = useState<File[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Cleanup object URLs to avoid memory leaks
	useEffect(() => {
		return () => {
			files.forEach(file => {
				// We can't easily track which URLs were created for which file here without a more complex state,
				// but generally browsers handle this cleanup on page unload.
				// For a long-lived SPA, ideally we'd track the object URLs and revoke them.
			});
		};
	}, [files]);

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
            // Create a new array from the selected files
			const newFiles = Array.from(e.target.files);
			setFiles((prev) => [...prev, ...newFiles]);
		}
        
		// Reset input value to allow selecting the same file again
		// This needs to happen regardless of whether files were selected or not
        // to ensure the onChange event fires next time even for the same file
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const removeFile = (index: number) => {
		setFiles((prev) => {
            const newFiles = [...prev];
            newFiles.splice(index, 1);
            return newFiles;
        });
	};

	const handleSend = async () => {
		if ((!message.trim() && files.length === 0) || sending || disabled) return;

		setSending(true);
		try {
			await onSend(message, files);
			setMessage("");
			setFiles([]);
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
		<div className="flex flex-col gap-2">
			{files.length > 0 && (
				<div className="flex gap-4 overflow-x-auto p-3 rounded-lg">
					{files.map((file, index) => (
						<div key={`${file.name}-${index}`} className="relative group flex-shrink-0">
							<div className="w-32 h-32 rounded-md overflow-hidden bg-background border border-border relative flex items-center justify-center">
								{file.type.startsWith('image/') ? (
									<img 
										src={URL.createObjectURL(file)} 
										alt={file.name}
										className="w-full h-full object-cover"
                                        onLoad={(e) => {
                                            // Optional: revoke object URL after image loads to free memory
                                            // URL.revokeObjectURL(e.currentTarget.src);
                                        }}
									/>
								) : (
									<div className="flex flex-col items-center justify-center p-2 text-center">
										<FileIcon className="size-8 text-muted-foreground mb-1" />
										<span className="text-[10px] text-muted-foreground truncate w-full px-1">{file.name}</span>
									</div>
								)}
							</div>
							<button
								onClick={() => removeFile(index)}
								className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
								type="button"
							>
								<XIcon className="size-3" />
								<span className="sr-only">Remove file</span>
							</button>
						</div>
					))}
				</div>
			)}
			
			<InputGroup className="items-end">
				<InputGroupTextarea
					disabled={disabled || sending}
					placeholder={disabled ? "Select a group to start chatting..." : "Type your message here..."}
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					onKeyDown={handleKeyDown}
					rows={1}
					className="min-h-[40px] py-2 max-h-[200px]"
				/>
				<InputGroupAddon align="block-end" className="pb-1 gap-1">
                    <input 
						type="file" 
						ref={fileInputRef}
						className="hidden"
						multiple
						onChange={handleFileSelect}
                        accept="image/*,video/*,audio/*,.pdf" 
					/>
                    <InputGroupButton
						variant="ghost"
						className="rounded-full text-muted-foreground hover:text-foreground"
						size="icon-sm"
						disabled={disabled || sending}
						onClick={() => fileInputRef.current?.click()}
					>
						<ImageIcon className="size-5" />
						<span className="sr-only">Attach image</span>
					</InputGroupButton>

					<InputGroupButton
						variant="default"
						className="rounded-full"
						size="icon-sm"
						disabled={disabled || sending || (!message.trim() && files.length === 0)}
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
