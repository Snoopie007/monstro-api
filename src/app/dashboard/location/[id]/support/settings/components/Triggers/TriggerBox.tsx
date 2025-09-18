"use client";

import React, { useState } from "react";
import { Plus, MessageSquare, InfoIcon } from "lucide-react";
import {
	Button,
	ScrollArea,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui";
import { SupportAssistant, SupportTrigger } from "@/types";
import { FormLabel } from "@/components/forms";
import {
	TriggerItem,
} from ".";
import { TriggerDialog } from "./TriggerDialog";

interface TriggerFieldsProps {

	assistant: SupportAssistant;
}

export function TriggerBox({ assistant }: TriggerFieldsProps) {

	const [triggers, setTriggers] = useState<SupportTrigger[]>(assistant.triggers || []);
	const [selectedTrigger, setSelectedTrigger] = useState<SupportTrigger | null>(null);


	async function handleUpdate(trigger: SupportTrigger | null, type: 'create' | 'update' | 'delete') {
		// if (type === 'create') {
		// 	setTriggers([...triggers, trigger]);
		// } else if (type === 'update') {
		// 	setTriggers(triggers.map((t) => t.id === trigger.id ? trigger : t));
		// } else if (type === 'delete') {
		// 	setTriggers(triggers.filter((t) => t.id !== trigger.id));
		// }
	}
	// const handleCreateTrigger = async (triggerData: Partial<SupportTrigger>) => {
	// 	const tmpId =
	// 		triggerData.id ||
	// 		(typeof crypto !== "undefined" && "randomUUID" in crypto
	// 			? crypto.randomUUID()
	// 			: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

	// 	const current = (form.getValues("triggers") || []) as SupportTrigger[];
	// 	const next = [
	// 		...current,
	// 		{ ...triggerData, id: tmpId },
	// 	] as SupportTrigger[];

	// 	form.setValue("triggers", next as any, {
	// 		shouldDirty: true,
	// 		shouldValidate: true,
	// 	});
	// 	await form.trigger("triggers");
	// 	setCreateDialogOpen(false);
	// };

	// const handleEditTrigger = async (triggerId: string, triggerData: Partial<SupportTrigger>) => {
	// 	const current = (form.getValues("triggers") || []) as SupportTrigger[];
	// 	const next = current.map((t) =>
	// 		t.id === triggerId ? { ...t, ...triggerData } : t
	// 	) as SupportTrigger[];

	// 	form.setValue("triggers", next as any, {
	// 		shouldDirty: true,
	// 		shouldValidate: true,
	// 	});
	// 	await form.trigger("triggers");
	// 	setEditDialogOpen(false);
	// 	setEditingTrigger(null);
	// };

	// const handleDeleteTrigger = async (triggerId: string) => {
	// 	const current = (form.getValues("triggers") || []) as SupportTrigger[];
	// 	const next = current.filter((t) => t.id !== triggerId) as SupportTrigger[];

	// 	form.setValue("triggers", next as any, {
	// 		shouldDirty: true,
	// 		shouldValidate: true,
	// 	});
	// 	await form.trigger("triggers");
	// };

	// const handleToggleTrigger = async (triggerId: string, isActive: boolean) => {
	// 	const current = (form.getValues("triggers") || []) as SupportTrigger[];
	// 	const next = current.map((t) =>
	// 		t.id === triggerId ? { ...t, isActive } : t
	// 	) as SupportTrigger[];

	// 	form.setValue("triggers", next as any, {
	// 		shouldDirty: true,
	// 		shouldValidate: true,
	// 	});
	// 	await form.trigger("triggers");
	// };

	return (
		<div className="bg-background rounded-lg px-4 py-2">
			<div className="flex items-center justify-between border-b border-foreground/10 pb-2">
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
				<TriggerDialog assistant={assistant} trigger={selectedTrigger} />
			</div>
			<ScrollArea className="max-h-[30vh] overflow-y-auto">
				{assistant.triggers?.length === 0 ? (
					<div className="text-center py-8" >
						<MessageSquare size={16} className="mx-auto text-muted-foreground mb-2" />
						<p className="text-sm font-medium">No triggers configured yet</p>
						<p className="text-xs text-muted-foreground">
							Create your first trigger to automate responses
						</p>
					</div>
				) : (
					<div className="space-y-2 py-2">
						{assistant.triggers?.map((trigger, index) => (
							<TriggerItem
								key={index}
								trigger={trigger}
								onSelect={setSelectedTrigger}
								onUpdate={() => { }}
							/>
						))}
					</div>
				)}
			</ScrollArea>
			{/* <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
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
			</Dialog> */}
		</div>
	);
}
