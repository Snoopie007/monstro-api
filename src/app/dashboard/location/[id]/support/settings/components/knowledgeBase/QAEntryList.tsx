"use client";

import React from "react";
import { Button, ScrollArea } from "@/components/ui";
import { MessageSquare, Edit, Trash2 } from "lucide-react";
import { QAEntry } from "@/types/knowledgeBase";

interface QAEntryListProps {
	entries: QAEntry[];
	onEdit: (entry: QAEntry) => void;
	onDelete: (entryId: string) => void;
	isLoading?: boolean;
}

export function QAEntryList({ entries, onEdit, onDelete }: QAEntryListProps) {
	const truncateText = (text: string, limit: number = 100) => {
		if (text.length <= limit) return text;
		return text.substring(0, limit) + "...";
	};

	if (entries.length === 0) {
		return (
			<div className="text-center py-8" >
				<MessageSquare size={16} className="mx-auto text-muted-foreground mb-2" />
				<p className="text-sm font-medium">No Q&A entries yet</p>
				<p className="text-xs text-muted-foreground">Click "Add Q&A Entry" above to get started</p>
			</div>
		);
	}

	return (
		<ScrollArea className="max-h-[50vh] overflow-y-auto py-2">
			<div className="space-y-3">
				{entries.map((entry) => {
					return (
						<div className="flex items-center justify-between gap-2">
							<p className="text-sm font-medium leading-relaxed">
								{truncateText(entry.question, 30)}
							</p>


							<div className="flex items-center gap-1">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => onEdit(entry)}
									className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
									title="Edit entry"
								>
									<Edit size={14} />
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => onDelete(entry.id)}
									className="h-8 w-8 p-0 text-red-600 focus:text-red-600"
									title="Delete entry"
								>
									<Trash2 size={14} />
								</Button>
							</div>
						</div>
					);
				})}
			</div >
		</ScrollArea >
	);
}
