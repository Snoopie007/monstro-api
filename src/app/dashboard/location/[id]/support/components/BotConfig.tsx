"use client";

import React, { useState, useEffect } from "react";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Button,
	SheetTrigger,

} from "@/components/ui";
import {
	Input,
	Label,
	Textarea,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Slider,
} from "@/components/forms";
import {
	Settings,
	Save,
} from "lucide-react";
import { SupportAssistant } from "@/types";
import { KnowledgeBase } from "@/types/knowledgeBase";
import {
	TriggersSection,
	PersonaSection,
} from "./";
import { toast } from "react-toastify";
import { useSupport } from "../providers";

interface BotConfigProps {
	lid: string;
}

export function BotConfig({ lid }: BotConfigProps) {
	const [editData, setEditData] = useState<Partial<SupportAssistant>>({});
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);
	const { assistant, updateAssistant } = useSupport();

	// Initialize edit data when support assistant changes
	useEffect(() => {
		if (assistant) {
			setEditData({
				...assistant,
			});
			setHasChanges(false);
		} else {
			// Default values for new support assistant
			setEditData({
				name: "Support Assistant",
				prompt: "You are a helpful customer support assistant.",
				initialMessage:
					"Hi! I'm here to help you. What can I assist you with today?",
				temperature: 0,
				model: "gpt",
				status: "draft",
			});
			setHasChanges(false);
		}
	}, [assistant]);

	const handleInputChange = (field: keyof SupportAssistant, value: any) => {
		setEditData((prev) => ({ ...prev, [field]: value }));
		setHasChanges(true);
	};

	const handleSave = async () => {
		if (!hasChanges) return;

		setLoading(true);
		try {
			await updateAssistant(editData as SupportAssistant);
			setHasChanges(false);
		} catch (error) {
			console.error("Failed to update support assistant:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleKnowledgeBaseUpdate = async (updates: Partial<KnowledgeBase>) => {
		if (!assistant) return;

		// const currentKnowledgeBase = assistant.knowledgeBase || { qa_entries: [], document: null };
		const updatedKnowledgeBase = {
			// ...currentKnowledgeBase,
			...updates
		};

		try {
			//update assistant
			updateAssistant({
				...assistant,
				// knowledgeBase: updatedKnowledgeBase
			});

			toast.success("Knowledge base updated successfully");
		} catch (error) {
			console.error("Failed to update knowledge base:", error);
			toast.error("Failed to update knowledge base. Please try again.");
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "Active":
				return "bg-green-500";
			case "Draft":
				return "bg-yellow-500";
			case "Paused":
				return "bg-orange-500";
			default:
				return "bg-gray-500";
		}
	};

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button variant="ghost" size="icon" className="size-8">
					<Settings size={16} />
				</Button>
			</SheetTrigger>
			<SheetContent className="w-[800px] sm:max-w-[800px] overflow-y-auto">
				<SheetHeader>
					<SheetTitle className="flex items-center gap-2">
						<Settings size={20} />
						Support Bot Configuration
					</SheetTitle>
					<SheetDescription>
					</SheetDescription>
				</SheetHeader>

				<div className="mt-6">
					<Tabs defaultValue="general" className="w-full">
						<TabsList className="grid w-full grid-cols-4">
							{['general', 'triggers', 'persona', 'knowledge'].map((tab) => (
								<TabsTrigger
									key={tab}
									value={tab}
									className="flex items-center gap-1 capitalize"
								>
									{tab}
								</TabsTrigger>
							))}
						</TabsList>

						{/* General Settings Tab */}
						<TabsContent value="general" className="space-y-4">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Settings size={18} />
										Basic Settings
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="grid grid-cols-2 gap-4">
										<div>
											<Label htmlFor="bot-name">Bot Name</Label>
											<Input
												id="bot-name"
												value={editData.name || ""}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													handleInputChange("name", e.target.value)
												}
												placeholder="Enter bot name"
											/>
										</div>
										<div>
											<Label htmlFor="bot-status">Status</Label>
											<Select
												value={editData.status}
												onValueChange={(value: string) =>
													handleInputChange("status", value)
												}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select status" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="Draft">
														<div className="flex items-center gap-2">
															<div
																className={`w-2 h-2 rounded-full ${getStatusColor(
																	"Draft"
																)}`}
															/>
															Draft
														</div>
													</SelectItem>
													<SelectItem value="Active">
														<div className="flex items-center gap-2">
															<div
																className={`w-2 h-2 rounded-full ${getStatusColor(
																	"Active"
																)}`}
															/>
															Active
														</div>
													</SelectItem>
													<SelectItem value="Paused">
														<div className="flex items-center gap-2">
															<div
																className={`w-2 h-2 rounded-full ${getStatusColor(
																	"Paused"
																)}`}
															/>
															Paused
														</div>
													</SelectItem>
												</SelectContent>
											</Select>
										</div>
									</div>

									<div>
										<Label htmlFor="ai-model">AI Model</Label>
										<Select
											value={editData.model}
											onValueChange={(value: string) =>
												handleInputChange("model", value)
											}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select AI model" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="gpt">GPT-4</SelectItem>
												<SelectItem value="anthropic">Claude</SelectItem>
												<SelectItem value="gemini">Gemini</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div>
										<Label htmlFor="temperature">
											Temperature: {editData.temperature}
										</Label>
										<Slider
											value={[editData.temperature || 0]}
											onValueChange={(value: number[]) =>
												handleInputChange("temperature", value[0])
											}
											max={100}
											step={5}
											className="mt-2"
										/>
										<div className="flex justify-between text-xs text-muted-foreground mt-1">
											<span>Focused</span>
											<span>Creative</span>
										</div>
									</div>

									<div>
										<Label htmlFor="initial-message">Initial Message</Label>
										<Textarea
											id="initial-message"
											value={editData.initialMessage || ""}
											onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
												handleInputChange("initialMessage", e.target.value)
											}
											placeholder="Enter the bot's greeting message"
											rows={2}
										/>
									</div>

									<div>
										<Label htmlFor="bot-prompt">System Prompt</Label>
										<Textarea
											id="bot-prompt"
											value={editData.prompt || ""}
											onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
												handleInputChange("prompt", e.target.value)
											}
											placeholder="Enter the bot's system prompt"
											rows={4}
										/>
									</div>

									<div className="flex justify-end gap-2">
										<Button
											onClick={handleSave}
											disabled={!hasChanges || loading}
											className="gap-2"
										>
											<Save size={16} />
											{loading ? "Saving..." : "Save Changes"}
										</Button>
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						{/* Triggers Tab */}
						<TabsContent value="triggers" className="space-y-4">
							<TriggersSection
								locationId={lid}
								supportAssistant={assistant}
							/>
						</TabsContent>

						{/* Persona Tab */}
						<TabsContent value="persona" className="space-y-4">
							<PersonaSection locationId={lid} supportAssistant={assistant} />
						</TabsContent>

						{/* Knowledge Base Tab */}
						<TabsContent value="knowledge" className="space-y-4">
							{/* <DocumentsSection
								locationId={lid}
								supportAssistant={assistant}
								knowledgeBase={assistant?.knowledgeBase || { qa_entries: [], document: null }}
								onKnowledgeBaseUpdate={handleKnowledgeBaseUpdate}
							/> */}
						</TabsContent>
					</Tabs>
				</div>
			</SheetContent>
		</Sheet>
	);
}
