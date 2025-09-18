"use client";
import { FormLabel } from "@/components/forms";
import {
	Button,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogClose,
	DialogDescription,
} from "@/components/ui";
import { SupportSettingsSchema } from "@/libs/FormSchemas";
import { InfoIcon, Plus, X } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { QAEntry } from "@/types/knowledgeBase";
import { QAEntryForm } from "./QAEntryForm";
import { QAEntryList } from "./QAEntryList";
import { VisuallyHidden } from "react-aria";

interface KnowledgeBaseFieldsProps {
	form: UseFormReturn<z.infer<typeof SupportSettingsSchema>>;
}

export function KnowledgeBaseFields({ form }: KnowledgeBaseFieldsProps) {
	const qaEntries = form.watch("knowledgeBase").qa_entries;
	const [open, setOpen] = useState(false);
	const [editingEntry, setEditingEntry] = useState<QAEntry | null>(null);
	const [isSubmittingQA, setIsSubmittingQA] = useState(false);

	async function handleQASubmit({ question, answer }: { question: string; answer: string }) {
		setOpen(false);
		setEditingEntry(null);
		setIsSubmittingQA(false);

		await form.trigger("knowledgeBase.qa_entries");
	};

	async function handleQAEdit(entry: QAEntry) {
		setEditingEntry(entry);
		setOpen(true);
	};

	async function handleQADelete(entryId: string) {
		const currentEntries = form.getValues("knowledgeBase.qa_entries") || [];
		const updatedEntries = currentEntries.filter(
			(entry) => entry.id !== entryId
		);
		form.setValue("knowledgeBase.qa_entries", updatedEntries);

		await form.trigger("knowledgeBase.qa_entries");
	};

	async function handleQAFormCancel() {
		setOpen(false);
		setEditingEntry(null);
	};

	async function handleAddNew() {
		setEditingEntry(null);
		setOpen(true);
	};

	return (
		<div className="space-y-4 bg-background rounded-lg">
			<div className="flex items-center justify-between px-4 py-2">
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
				<Dialog open={open} onOpenChange={setOpen}>
					<DialogTrigger asChild>
						<Button size="sm" variant="ghost" className="hover:bg-foreground/10">
							Q&A Entry
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-2xl p-4">
						<VisuallyHidden>
							<DialogTitle></DialogTitle>
							<DialogDescription></DialogDescription>
						</VisuallyHidden>
						<QAEntryForm
							form={form}
							onSubmit={handleQASubmit}
							onCancel={handleQAFormCancel}
							initialData={editingEntry}
							isSubmitting={isSubmittingQA}
						/>
					</DialogContent>
				</Dialog>
			</div>
			<QAEntryList
				entries={qaEntries}
				onEdit={handleQAEdit}
				onDelete={handleQADelete}
				isLoading={false}
			/>
		</div>
	);
}
