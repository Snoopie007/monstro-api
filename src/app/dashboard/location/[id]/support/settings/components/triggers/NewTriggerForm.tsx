"use client";

import React, { useState } from "react";
import { Button, Badge } from "@/components/ui";
import {
	Label,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/forms";
import { X, Plus } from "lucide-react";
import { toast } from "react-toastify";
import { SupportTrigger } from "@/types/support";

interface NewTriggerFormProps {
	onSubmit: (triggerData: Partial<SupportTrigger>) => void;
	onCancel: () => void;
}

const AVAILABLE_TOOLS = [
	{
		name: "get_member_status",
		description: "Get member subscription and package status",
		category: "member-info",
	},
	{
		name: "get_member_billing",
		description: "Get member billing and payment information",
		category: "member-info",
	},
	{
		name: "get_member_bookable_sessions",
		description: "Get classes the member can book",
		category: "member-info",
	},
	{
		name: "create_support_ticket",
		description: "Create a support ticket for issue tracking",
		category: "support",
	},
	{
		name: "update_ticket_status",
		description: "Update the status of a support ticket",
		category: "support",
	},
	{
		name: "search_knowledge",
		description: "Search the knowledge base for information",
		category: "knowledge",
	},
	{
		name: "escalate_to_human",
		description: "Escalate conversation to human agent",
		category: "support",
	},
];

export function NewTriggerForm({ onSubmit, onCancel }: NewTriggerFormProps) {
	// Internal state
	const [formData, setFormData] = useState<Partial<SupportTrigger>>({
		name: "",
		triggerType: "keyword",
		triggerPhrases: [],
		toolCall: { name: "", parameters: {}, description: "", args: [] },
		examples: [],
		requirements: [],
		isActive: true,
	});
	const [newPhrase, setNewPhrase] = useState("");
	const [newExample, setNewExample] = useState("");
	const [newRequirement, setNewRequirement] = useState("");

	const handleInputChange = (field: keyof SupportTrigger, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleToolCallChange = (toolName: string) => {
		setFormData((prev) => ({
			...prev,
			toolCall: { name: toolName, parameters: {}, description: "", args: [] },
		}));
	};

	const addPhrase = () => {
		if (newPhrase.trim()) {
			setFormData((prev) => ({
				...prev,
				triggerPhrases: [...(prev.triggerPhrases || []), newPhrase.trim()],
			}));
			setNewPhrase("");
		}
	};

	const removePhrase = (index: number) => {
		setFormData((prev) => ({
			...prev,
			triggerPhrases: prev.triggerPhrases?.filter((_, i) => i !== index) || [],
		}));
	};

	const addExample = () => {
		if (newExample.trim()) {
			setFormData((prev) => ({
				...prev,
				examples: [...(prev.examples || []), newExample.trim()],
			}));
			setNewExample("");
		}
	};

	const removeExample = (index: number) => {
		setFormData((prev) => ({
			...prev,
			examples: prev.examples?.filter((_, i) => i !== index) || [],
		}));
	};

	const addRequirement = () => {
		if (newRequirement.trim()) {
			setFormData((prev) => ({
				...prev,
				requirements: [...(prev.requirements || []), newRequirement.trim()],
			}));
			setNewRequirement("");
		}
	};

	const removeRequirement = (index: number) => {
		setFormData((prev) => ({
			...prev,
			requirements: prev.requirements?.filter((_, i) => i !== index) || [],
		}));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.name?.trim()) {
			toast.error("Please enter a trigger name");
			return;
		}

		if (!formData.triggerPhrases?.length) {
			toast.error("Please add at least one trigger phrase");
			return;
		}

		if (!formData.toolCall?.name) {
			toast.error("Please select a tool to execute");
			return;
		}

		onSubmit(formData);
	};

	const selectedTool = AVAILABLE_TOOLS.find(
		(tool) => tool.name === formData.toolCall?.name
	);

	const CamelCaseToolName = (toolName: string) => {
		return toolName
			.replace(/_/g, " ")
			.replace(/\b\w/g, (char) => char.toUpperCase());
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">

			<div className="space-y-4">
				<div>
					<Label htmlFor="trigger-name" size="tiny">Trigger Name</Label>
					<Input
						id="trigger-name"
						value={formData.name || ""}
						onChange={(e) => handleInputChange("name", e.target.value)}
					/>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div>
						<Label htmlFor="trigger-type" size="tiny">Trigger Type</Label>
						<Select
							value={formData.triggerType}
							onValueChange={(value) => handleInputChange("triggerType", value)}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="keyword">Keyword</SelectItem>
								<SelectItem value="intent">Intent</SelectItem>
								<SelectItem value="condition">Condition</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div>
						<Label htmlFor="tool-call" size="tiny">Tool to Execute</Label>
						<Select
							value={formData.toolCall?.name || ""}
							onValueChange={handleToolCallChange}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select a tool" />
							</SelectTrigger>
							<SelectContent>
								{AVAILABLE_TOOLS.map((tool) => (
									<SelectItem key={tool.name} value={tool.name}>
										{CamelCaseToolName(tool.name)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{selectedTool && (
							<p className="text-xs text-muted-foreground mt-1">
								{selectedTool.description}
							</p>
						)}
					</div>
				</div>
			</div>

			{/* Trigger Phrases */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<Label htmlFor="trigger-phrases" size="tiny">Trigger Phrases</Label>
					<Button type="button" onClick={addPhrase} size="icon" variant="outline" className="size-5">
						<Plus size={14} />
					</Button>

				</div>
				<div className="space-y-2">
					<div className="flex gap-2">
						<Input
							value={newPhrase}
							onChange={(e) => setNewPhrase(e.target.value)}
							placeholder="Enter trigger phrase"
							onKeyDown={(e) =>
								e.key === "Enter" && (e.preventDefault(), addPhrase())
							}
						/>
					</div>
					<div className="flex flex-wrap gap-2">
						{formData.triggerPhrases?.map((phrase, index) => (
							<span>x</span>
						))}
					</div>
				</div>
			</div>

			{/* Examples */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<Label htmlFor="example-messages" size="tiny">Example Messages</Label>
					<Button type="button" onClick={addExample} size="icon" variant="outline" className="size-5">
						<Plus size={14} />
					</Button>

				</div>
				<div className="space-y-2">
					<div className="flex gap-2">
						<Input
							value={newExample}
							onChange={(e) => setNewExample(e.target.value)}
							placeholder="Enter example message"
							onKeyDown={(e) =>
								e.key === "Enter" && (e.preventDefault(), addExample())
							}
						/>
					</div>
					<div className="flex flex-wrap gap-2">
						{formData.examples?.map((example, index) => (
							<Badge key={index} variant="outline" className="gap-1">
								{example}
								<button
									type="button"
									onClick={() => removeExample(index)}
									className="ml-1 hover:text-destructive"
								>
									<X size={12} />
								</button>
							</Badge>
						))}
					</div>
				</div>
			</div>

			<div className="space-y-2">

				<div className="flex items-center justify-between">
					<Label htmlFor="requirements" size="tiny">Requirements</Label>
					<Button type="button" onClick={addRequirement} size="icon" variant="outline" className="size-5">
						<Plus size={14} />
					</Button>

				</div>
				<div className="space-y-2">
					<div className="flex gap-2">
						<Input
							value={newRequirement}
							onChange={(e) => setNewRequirement(e.target.value)}
							placeholder="Enter requirement"
							onKeyDown={(e) =>
								e.key === "Enter" && (e.preventDefault(), addRequirement())
							}
						/>
					</div>
					<div className="flex flex-wrap gap-2">
						{formData.requirements?.map((requirement, index) => (
							<Badge
								key={index}
								variant="outline"
								className="gap-1 bg-orange-50 text-orange-700 border-orange-200"
							>
								{requirement}
								<button
									type="button"
									onClick={() => removeRequirement(index)}
									className="ml-1 hover:text-destructive"
								>
									<X size={12} />
								</button>
							</Badge>
						))}
					</div>
				</div>
			</div>

			<div className="flex justify-end gap-2 pt-4 border-t">
				<Button type="button" size="sm" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" size="sm" variant="foreground">Create Trigger</Button>
			</div>
		</form>
	);
}
