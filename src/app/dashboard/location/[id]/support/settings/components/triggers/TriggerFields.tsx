"use client";

import React, { useState } from "react";
import { Plus, MessageSquare, InfoIcon } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	Button,
	ScrollArea,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
	DialogDescription,
} from "@/components/ui";
import { SupportAssistant, SupportTrigger } from "@/types";
import { FormLabel } from "@/components/forms";
import {
	NewTriggerForm,
	EditTriggerForm,
	ExistingTriggerItem,
} from ".";
import { VisuallyHidden } from "react-aria";

interface TriggerFieldsProps {

	assistant: SupportAssistant;
}

export function TriggerFields({ assistant }: TriggerFieldsProps) {
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editingTrigger, setEditingTrigger] = useState<SupportTrigger | null>(
		null
	);
	const triggers = form.watch("triggers") as SupportTrigger[];

	const handleCreateTrigger = async (triggerData: Partial<SupportTrigger>) => {
		const tmpId =
			triggerData.id ||
			(typeof crypto !== "undefined" && "randomUUID" in crypto
				? crypto.randomUUID()
				: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

		const current = (form.getValues("triggers") || []) as SupportTrigger[];
		const next = [
			...current,
			{ ...triggerData, id: tmpId },
		] as SupportTrigger[];

		form.setValue("triggers", next as any, {
			shouldDirty: true,
			shouldValidate: true,
		});
		await form.trigger("triggers");
		setCreateDialogOpen(false);
	};

	const handleEditTrigger = async (triggerId: string, triggerData: Partial<SupportTrigger>) => {
		const current = (form.getValues("triggers") || []) as SupportTrigger[];
		const next = current.map((t) =>
			t.id === triggerId ? { ...t, ...triggerData } : t
		) as SupportTrigger[];

		form.setValue("triggers", next as any, {
			shouldDirty: true,
			shouldValidate: true,
		});
		await form.trigger("triggers");
		setEditDialogOpen(false);
		setEditingTrigger(null);
	};

	const handleDeleteTrigger = async (triggerId: string) => {
		const current = (form.getValues("triggers") || []) as SupportTrigger[];
		const next = current.filter((t) => t.id !== triggerId) as SupportTrigger[];

		form.setValue("triggers", next as any, {
			shouldDirty: true,
			shouldValidate: true,
		});
		await form.trigger("triggers");
	};

	const handleToggleTrigger = async (triggerId: string, isActive: boolean) => {
		const current = (form.getValues("triggers") || []) as SupportTrigger[];
		const next = current.map((t) =>
			t.id === triggerId ? { ...t, isActive } : t
		) as SupportTrigger[];

		form.setValue("triggers", next as any, {
			shouldDirty: true,
			shouldValidate: true,
		});
		await form.trigger("triggers");
	};

	return (
		<div className="space-y-4 bg-background rounded-lg">
			<div className="flex items-center justify-between px-4 py-2">
				<div className="flex items-center gap-2">
					<FormLabel size="sm">Support Triggers</FormLabel>
					<Tooltip>
						<TooltipTrigger asChild>
							<InfoIcon size={14} className="text-muted-foreground" />
						</TooltipTrigger>
						<TooltipContent>
							Configure triggers that automatically execute specific actions
							when members use certain phrases
						</TooltipContent>
					</Tooltip>
				</div>
				<Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
					<DialogTrigger asChild>
						<Button size="sm" variant="ghost" className="hover:bg-foreground/10">

							Add Trigger
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-2xl p-4">
						<VisuallyHidden>
							<DialogTitle></DialogTitle>
							<DialogDescription></DialogDescription>
						</VisuallyHidden>
						<NewTriggerForm
							onSubmit={handleCreateTrigger}
							onCancel={() => setCreateDialogOpen(false)}
						/>
					</DialogContent>
				</Dialog>
			</div>
			<ScrollArea className="max-h-[30vh] overflow-y-auto">
				{triggers.length === 0 ? (
					<div className="text-center py-8" >
						<MessageSquare size={16} className="mx-auto text-muted-foreground mb-2" />
						<p className="text-sm font-medium">No triggers configured yet</p>
						<p className="text-xs text-muted-foreground">
							Create your first trigger to automate responses
						</p>
					</div>
				) : (
					<div className="space-y-4">
						{triggers.map((trigger) => (
							<ExistingTriggerItem
								key={trigger.id}
								trigger={trigger}
								handleToggleTrigger={handleToggleTrigger}
								setEditingTrigger={setEditingTrigger}
								setEditDialogOpen={setEditDialogOpen}
								handleDeleteTrigger={handleDeleteTrigger}
							/>
						))}
					</div>
				)}
			</ScrollArea>
			<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Edit Trigger</DialogTitle>
					</DialogHeader>
					{editingTrigger && (
						<EditTriggerForm
							trigger={editingTrigger}
							onSubmit={(data: Partial<SupportTrigger>) =>
								handleEditTrigger(editingTrigger.id, data)
							}
							onCancel={() => {
								setEditDialogOpen(false);
								setEditingTrigger(null);
							}}
						/>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
