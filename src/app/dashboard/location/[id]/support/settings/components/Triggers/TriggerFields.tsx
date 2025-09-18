"use client";

import React from "react";
import { Button } from "@/components/ui";
import {
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage,
	FormField,
} from "@/components/forms";
import { X, Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { SupportTrigger } from "@/types/support";
import { TriggerSchema } from "@/libs/FormSchemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, UseFormReturn } from "react-hook-form";
import { z } from "zod";


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

function TriggerPhrasesField({ form }: { form: UseFormReturn<z.infer<typeof TriggerSchema>> }) {
	const { fields, remove, append } = useFieldArray({
		control: form.control,
		name: "triggerPhrases",
	});

	return (
		<fieldset className="space-y-2">
			<FormLabel size="sm">Trigger Phrases</FormLabel>
			<div className=" border bg-foreground/5 border-foreground/10 rounded-md p-2 space-y-1">
				<div className="space-y-1">
					{fields.map((field, index) => (
						<FormField
							key={field.id}
							control={form.control}
							name={`triggerPhrases.${index}`}
							render={({ field }) => (
								<FormItem>
									<div className="flex gap-1 items-center">
										<FormControl>
											<Input {...field} value={field.value.value} />
										</FormControl>
										<Button type="button" variant="ghost" size="icon"
											className="rounded-sm size-5 hover:bg-red-500 hover:text-white transition-all duration-200"
											onClick={() => remove(index)}>
											<Trash2 className="size-3.5" />
										</Button>
									</div>
								</FormItem>
							)}
						/>
					))}
				</div>
				<Button type="button" variant="foreground" size="xs"
					className="rounded-sm "
					onClick={() => append({ value: '' })}
					disabled={fields.length >= 4}>
					+ Trigger Phrase
				</Button>
			</div>
		</fieldset>
	)
}

function ExampleField({ form }: { form: UseFormReturn<z.infer<typeof TriggerSchema>> }) {
	const { fields, remove, append } = useFieldArray({
		control: form.control,
		name: "examples",
	});

	return (
		<fieldset className="space-y-1">
			<FormLabel size="sm">Examples</FormLabel>
			<div className=" border bg-foreground/5 border-foreground/10 rounded-md p-2 space-y-1">
				<div className="space-y-1">
					{fields.map((field, index) => (
						<FormField
							key={field.id}
							control={form.control}
							name={`examples.${index}`}
							render={({ field }) => (
								<FormItem>
									<div className="flex gap-1 items-center">
										<FormControl>
											<Input {...field} value={field.value.value} />
										</FormControl>
										<Button type="button" variant="ghost" size="icon"
											className="rounded-sm size-5 hover:bg-red-500 hover:text-white transition-all duration-200"
											onClick={() => remove(index)}>
											<Trash2 className="size-3.5" />
										</Button>
									</div>
								</FormItem>
							)}
						/>
					))}
				</div>
				<Button type="button" variant="foreground" size="xs"
					className="rounded-sm "
					onClick={() => append({ value: '' })}
					disabled={fields.length >= 4}>
					+ Example
				</Button>
			</div>

		</fieldset>
	)
}

function RequirementField({ form }: { form: UseFormReturn<z.infer<typeof TriggerSchema>> }) {
	const { fields, remove, append } = useFieldArray({
		control: form.control,
		name: "requirements",
	});

	return (
		<fieldset className="space-y-2">
			<FormLabel size="sm">Requirements</FormLabel>
			<div className="space-y-1 border bg-foreground/5 border-foreground/10 rounded-md p-2 ">
				<div className="space-y-1">
					{fields.map((field, index) => (
						<FormField
							key={field.id}
							control={form.control}
							name={`requirements.${index}`}
							render={({ field }) => (
								<FormItem>

									<div className="flex gap-1 items-center">
										<FormControl>
											<Input {...field} value={field.value.value} />
										</FormControl>
										<Button type="button" variant="ghost" size="icon"
											className="rounded-sm size-5 hover:bg-red-500 hover:text-white transition-all duration-200"
											onClick={() => remove(index)}>
											<Trash2 className="size-3.5" />
										</Button>
									</div>
								</FormItem>
							)}
						/>
					))}
				</div>
				<Button type="button" variant="foreground" size="xs"
					className="rounded-sm "
					onClick={() => append({ value: '' })}
					disabled={fields.length >= 4}>
					+ Requirement
				</Button>
			</div>
		</fieldset>
	)
}

export function TriggerFields() {

	const form = useForm<z.infer<typeof TriggerSchema>>({
		resolver: zodResolver(TriggerSchema),
		defaultValues: {
			name: "",
			triggerType: "keyword",
			triggerPhrases: [],
			toolCall: { name: "", parameters: {}, description: "", args: {} },
			examples: [],
			requirements: [],
		},
		mode: "onChange"
	});

	// const [newPhrase, setNewPhrase] = useState("");
	// const [newExample, setNewExample] = useState("");
	// const [newRequirement, setNewRequirement] = useState("");

	// const handleInputChange = (field: keyof SupportTrigger, value: any) => {
	// 	setFormData((prev) => ({ ...prev, [field]: value }));
	// };

	// const handleToolCallChange = (toolName: string) => {
	// 	setFormData((prev) => ({
	// 		...prev,
	// 		toolCall: { name: toolName, parameters: {}, description: "", args: [] },
	// 	}));
	// };


	async function handleSubmit(v: z.infer<typeof TriggerSchema>) {
		if (!form.formState.isValid) return;
	};

	// const selectedTool = AVAILABLE_TOOLS.find(
	// 	(tool) => tool.name === formData.toolCall?.name
	// );


	return (
		<>

			<fieldset>
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel size="tiny">Trigger Name</FormLabel>
							<FormControl>
								<Input {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</fieldset>

			<fieldset className="grid grid-cols-2 gap-4">
				<FormField
					control={form.control}
					name="triggerType"
					render={({ field }) => (
						<FormItem>
							<FormLabel size="tiny">Trigger Type</FormLabel>
							<FormControl>
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{["keyword", "intent", "condition"].map((type) => (
											<SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
										))}
									</SelectContent>
								</Select>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="toolCall"
					render={({ field }) => (
						<FormItem>
							<FormLabel size="tiny">Tool to Execute</FormLabel>
							<FormControl>
								<Select value={field.value?.name || ""} onValueChange={(value) => field.onChange({ name: value })}>
									<SelectTrigger>
										<SelectValue placeholder="Select a tool" />
									</SelectTrigger>
									<SelectContent>
										{AVAILABLE_TOOLS.map((tool) => (
											<SelectItem key={tool.name} value={tool.name} className="capitalize">
												{tool.name.replace(/_/g, " ")}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</FormControl>
							{field.value?.name && (
								<p className="text-xs text-muted-foreground mt-1">
									{AVAILABLE_TOOLS.find(tool => tool.name === field.value?.name)?.description}
								</p>
							)}
							<FormMessage />
						</FormItem>
					)}
				/>
			</fieldset>

			<TriggerPhrasesField form={form} />

			<ExampleField form={form} />
			<RequirementField form={form} />
		</>
	);
}
