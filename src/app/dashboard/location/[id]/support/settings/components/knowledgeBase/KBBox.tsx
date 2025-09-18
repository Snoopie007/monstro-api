"use client";
import { FormLabel } from "@/components/forms";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui";
import { KnowledgeBaseSchema } from "@/libs/FormSchemas";
import { InfoIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";
import { QAEntry } from "@/types/knowledgeBase";
import { QAEntryForm } from "./QAEntryForm";
import { QAEntryList } from "./QAEntryList";
import { SupportAssistant } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";



export function KBBox({ assistant }: { assistant: SupportAssistant }) {


	const [entries, setEntries] = useState<QAEntry[]>(assistant.knowledgeBase.qa_entries);


	const form = useForm<z.infer<typeof KnowledgeBaseSchema>>({
		resolver: zodResolver(KnowledgeBaseSchema),
		defaultValues: {
			...assistant.knowledgeBase,
		},
	});

	useEffect(() => {
		form.reset({
			...assistant.knowledgeBase,
			qa_entries: entries,
		});
	}, [entries]);




	async function handleQADelete(entryId: string) {
		const currentEntries = form.getValues("qa_entries") || [];
		const updatedEntries = currentEntries.filter(
			(entry) => entry.id !== entryId
		);
		form.setValue("qa_entries", updatedEntries);

		await form.trigger("qa_entries");
	};



	return (
		<div className="bg-background rounded-lg px-4 py-2">
			<div className="flex items-center justify-between border-b border-foreground/10 pb-2">
				<div className="flex items-center gap-2">
					<FormLabel size="sm">Knowledge Base</FormLabel>
					<Tooltip>
						<TooltipTrigger asChild>
							<InfoIcon size={14} className="text-muted-foreground" />
						</TooltipTrigger>
						<TooltipContent>
							Add specific questions and answers for your support bot's
							knowledge base.
						</TooltipContent>
					</Tooltip>
				</div>

				<QAEntryForm form={form} />

			</div >
			<QAEntryList entries={form.watch("qa_entries")}
				onEdit={(entry) => {
					// setEditingEntry(entry);
				}}
				onDelete={handleQADelete}
				isLoading={false}
			/>
		</div >
	);
}
