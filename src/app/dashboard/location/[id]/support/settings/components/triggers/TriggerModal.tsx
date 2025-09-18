// import React from "react";
// import { Button, Badge } from "@/components/ui";
// import {
// 	Input,
// 	Select,
// 	SelectContent,
// 	SelectItem,
// 	SelectTrigger,
// 	SelectValue,
// 	FormField,
// 	FormItem,
// 	FormControl,
// 	FormLabel,
// 	FormMessage,
// } from "@/components/forms";
// import { UseFormReturn } from "react-hook-form";
// import { SupportSettingsSchema } from "@/libs/FormSchemas";
// import { z } from "zod";
// import { X, Plus } from "lucide-react";

// interface TriggersFieldsProps {
// 	form: UseFormReturn<z.infer<typeof SupportSettingsSchema>>;
// }

// const AVAILABLE_TOOLS = [
// 	{
// 		name: "get_member_status",
// 		description: "Get member subscription and package status",
// 		category: "member-info",
// 	},
// 	{
// 		name: "get_member_billing",
// 		description: "Get member billing and payment information",
// 		category: "member-info",
// 	},
// 	{
// 		name: "get_member_bookable_sessions",
// 		description: "Get classes the member can book",
// 		category: "member-info",
// 	},
// 	{
// 		name: "create_support_ticket",
// 		description: "Create a support ticket for issue tracking",
// 		category: "support",
// 	},
// 	{
// 		name: "update_ticket_status",
// 		description: "Update the status of a support ticket",
// 		category: "support",
// 	},
// 	{
// 		name: "search_knowledge",
// 		description: "Search the knowledge base for information",
// 		category: "knowledge",
// 	},
// 	{
// 		name: "escalate_to_human",
// 		description: "Escalate conversation to human agent",
// 		category: "support",
// 	},
// ];

// export function TriggersModal({ form }: TriggersFieldsProps) {
// 	const [newPhrase, setNewPhrase] = React.useState("");
// 	const [newExample, setNewExample] = React.useState("");

// 	// Get the first trigger from the form (assuming we're editing the first one)
// 	// This could be made more dynamic based on the use casea
// 	const triggers = form.watch("triggers");
// 	const triggerIndex = 0; // For single trigger editing, use index 0

// 	const handleAddPhrase = () => {
// 		if (newPhrase.trim()) {
// 			const currentPhrases = triggers[triggerIndex]?.triggerPhrases || [];
// 			form.setValue(`triggers.${triggerIndex}.triggerPhrases`, [
// 				...currentPhrases,
// 				newPhrase.trim(),
// 			]);
// 			setNewPhrase("");
// 		}
// 	};

// 	const handleRemovePhrase = (index: number) => {
// 		const currentPhrases = triggers[triggerIndex]?.triggerPhrases || [];
// 		const updatedPhrases = currentPhrases.filter((_, i) => i !== index);
// 		form.setValue(`triggers.${triggerIndex}.triggerPhrases`, updatedPhrases);
// 	};

// 	const handleAddExample = () => {
// 		if (newExample.trim()) {
// 			const currentExamples = triggers[triggerIndex]?.examples || [];
// 			form.setValue(`triggers.${triggerIndex}.examples`, [
// 				...currentExamples,
// 				newExample.trim(),
// 			]);
// 			setNewExample("");
// 		}
// 	};

// 	const handleRemoveExample = (index: number) => {
// 		const currentExamples = triggers[triggerIndex]?.examples || [];
// 		const updatedExamples = currentExamples.filter((_, i) => i !== index);
// 		form.setValue(`triggers.${triggerIndex}.examples`, updatedExamples);
// 	};

// 	const selectedTool = AVAILABLE_TOOLS.find(
// 		(tool) => tool.name === triggers[triggerIndex]?.toolCall?.name
// 	);

// 	return (
// 		<div className="space-y-6 bg-foreground/5 rounded-md p-4">

// 			<div className="space-y-4">
// 				<div className="flex items-center justify-between">
// 					<div className="flex-1 mr-4">
// 						<FormField
// 							control={form.control}
// 							name={`triggers.${triggerIndex}.name`}
// 							render={({ field }) => (
// 								<FormItem>
// 									<FormLabel size="tiny">Trigger Name</FormLabel>
// 									<FormControl>
// 										<Input
// 											{...field}
// 											placeholder="e.g., Membership Status Check"
// 										/>
// 									</FormControl>
// 									<FormMessage />
// 								</FormItem>
// 							)}
// 						/>
// 					</div>
// 				</div>

// 				<div className="grid grid-cols-2 gap-4">
// 					<FormField
// 						control={form.control}
// 						name={`triggers.${triggerIndex}.triggerType`}
// 						render={({ field }) => (
// 							<FormItem>
// 								<FormLabel>Trigger Type</FormLabel>
// 								<Select onValueChange={field.onChange} value={field.value}>
// 									<FormControl>
// 										<SelectTrigger>
// 											<SelectValue />
// 										</SelectTrigger>
// 									</FormControl>
// 									<SelectContent>
// 										<SelectItem value="keyword">Keyword</SelectItem>
// 										<SelectItem value="intent">Intent</SelectItem>
// 										<SelectItem value="condition">Condition</SelectItem>
// 									</SelectContent>
// 								</Select>
// 								<FormMessage />
// 							</FormItem>
// 						)}
// 					/>

// 					<FormField
// 						control={form.control}
// 						name={`triggers.${triggerIndex}.toolCall`}
// 						render={({ field }) => (
// 							<FormItem>
// 								<FormLabel>Tool to Execute *</FormLabel>
// 								<Select
// 									value={field.value?.name || ""}
// 									onValueChange={(toolName) => {
// 										const tool = AVAILABLE_TOOLS.find(
// 											(t) => t.name === toolName
// 										);
// 										field.onChange({
// 											name: toolName,
// 											description: tool?.description || "",
// 											parameters: {},
// 											args: [],
// 										});
// 									}}
// 								>
// 									<FormControl>
// 										<SelectTrigger>
// 											<SelectValue placeholder="Select a tool" />
// 										</SelectTrigger>
// 									</FormControl>
// 									<SelectContent>
// 										{AVAILABLE_TOOLS.map((tool) => (
// 											<SelectItem key={tool.name} value={tool.name}>
// 												<div>
// 													<div className="font-medium">{tool.name}</div>
// 													<div className="text-xs text-muted-foreground">
// 														{tool.description}
// 													</div>
// 												</div>
// 											</SelectItem>
// 										))}
// 									</SelectContent>
// 								</Select>
// 								{selectedTool && (
// 									<p className="text-xs text-muted-foreground mt-1">
// 										{selectedTool.description}
// 									</p>
// 								)}
// 								<FormMessage />
// 							</FormItem>
// 						)}
// 					/>
// 				</div>
// 			</div>

// 			<FormField
// 				control={form.control}
// 				name={`triggers.${triggerIndex}.triggerPhrases`}
// 				render={({ field }) => (
// 					<FormItem>
// 						<FormLabel>Trigger Phrases *</FormLabel>
// 						<div className="space-y-2">
// 							<div className="flex gap-2">
// 								<Input
// 									value={newPhrase}
// 									onChange={(e) => setNewPhrase(e.target.value)}
// 									placeholder="Enter trigger phrase"
// 									onKeyDown={(e) =>
// 										e.key === "Enter" && (e.preventDefault(), handleAddPhrase())
// 									}
// 								/>
// 								<Button type="button" onClick={handleAddPhrase} size="sm">
// 									<Plus size={14} />
// 								</Button>
// 							</div>
// 							<div className="flex flex-wrap gap-2">
// 								{field.value?.map((phrase: string, index: number) => (
// 									<Badge key={index} variant="secondary" className="gap-1">
// 										{phrase}
// 										<button
// 											type="button"
// 											onClick={() => handleRemovePhrase(index)}
// 											className="ml-1 hover:text-destructive"
// 										>
// 											<X size={12} />
// 										</button>
// 									</Badge>
// 								))}
// 							</div>
// 						</div>
// 						<FormMessage />
// 					</FormItem>
// 				)}
// 			/>

// 			<FormField
// 				control={form.control}
// 				name={`triggers.${triggerIndex}.examples`}
// 				render={({ field }) => (
// 					<FormItem>
// 						<FormLabel>Example Messages</FormLabel>
// 						<div className="space-y-2">
// 							<div className="flex gap-2">
// 								<Input
// 									value={newExample}
// 									onChange={(e) => setNewExample(e.target.value)}
// 									placeholder="Enter example message"
// 									onKeyPress={(e) =>
// 										e.key === "Enter" &&
// 										(e.preventDefault(), handleAddExample())
// 									}
// 								/>
// 								<Button type="button" onClick={handleAddExample} size="sm">
// 									<Plus size={14} />
// 								</Button>
// 							</div>
// 							<div className="flex flex-wrap gap-2">
// 								{field.value?.map((example: string, index: number) => (
// 									<Badge key={index} variant="outline" className="gap-1">
// 										{example}
// 										<button
// 											type="button"
// 											onClick={() => handleRemoveExample(index)}
// 											className="ml-1 hover:text-destructive"
// 										>
// 											<X size={12} />
// 										</button>
// 									</Badge>
// 								))}
// 							</div>
// 						</div>
// 						<FormMessage />
// 					</FormItem>
// 				)}
// 			/>
// 		</div>
// 	);
// }
