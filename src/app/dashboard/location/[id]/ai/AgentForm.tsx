"use client";
import React, { useMemo, useState } from "react";
import type { Agent, AgentParameters, AgentTone, Inbox } from "@/types/ai";

type Mode = "create" | "edit";

export interface AgentFormProps {
	mode: Mode;
	initialAgent?: Partial<Agent>;
	onCancel?: () => void;
	onSubmit?: (agent: Agent) => void; // For now we will console.log in default handler
	availableInboxes?: Inbox[]; // Optional: list of inboxes to assign agent to
}

const DEFAULT_PARAMETERS: AgentParameters = {
	model: "gpt-4o-mini",
	temperature: 0.6,
	maxTokens: 800,
	topP: 1,
	tone: "professional",
};

const DEFAULT_INBOXES: Inbox[] = [
	{ id: "inbox-1", name: "Website Chat" },
	{ id: "inbox-2", name: "Facebook Messenger" },
	{ id: "inbox-3", name: "WhatsApp" },
];

export default function AgentForm({ mode, initialAgent, onCancel, onSubmit, availableInboxes }: AgentFormProps) {
	const [name, setName] = useState(initialAgent?.name ?? "");
	const [systemPrompt, setSystemPrompt] = useState(initialAgent?.systemPrompt ?? "You are a helpful support agent for our business locations.");
	const [parameters, setParameters] = useState<AgentParameters>(
		{
			...DEFAULT_PARAMETERS,
			...(initialAgent?.parameters ?? {} as AgentParameters),
		}
	);
	const [assignedInboxIds, setAssignedInboxIds] = useState<string[]>(initialAgent?.assignedInboxIds ?? []);

	const [isSubmitting, setIsSubmitting] = useState(false);

	const isValid = useMemo(() => {
		return name.trim().length > 1 && systemPrompt.trim().length > 0;
	}, [name, systemPrompt]);

	function updateParameters<T extends keyof AgentParameters>(key: T, value: AgentParameters[T]) {
		setParameters((prev) => ({ ...prev, [key]: value }));
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!isValid || isSubmitting) return;
		setIsSubmitting(true);

		// Mock: construct agent payload
		const payload: Agent = {
			id: initialAgent?.id ?? "temp-id",
			name,
			systemPrompt,
			parameters,
			assignedInboxIds,
			isActive: initialAgent?.isActive ?? true,
		};

		// TODO backend: create or update agent in database
		// - If mode === "create": POST /api/locations/:id/agents
		// - If mode === "edit": PATCH /api/locations/:id/agents/:agentId
		console.log(`[AgentForm] ${mode} agent payload:`, payload);

		try {
			if (onSubmit) {
				onSubmit(payload);
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<label className="text-sm font-medium text-foreground">Name</label>
				<input
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="e.g. Front Desk Assistant"
					className="border border-input bg-background text-foreground placeholder:text-muted-foreground rounded px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				/>
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-sm font-medium text-foreground">System Prompt</label>
				<textarea
					value={systemPrompt}
					onChange={(e) => setSystemPrompt(e.target.value)}
					rows={6}
					className="border border-input bg-background text-foreground placeholder:text-muted-foreground rounded px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				/>
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-sm font-medium text-foreground">Assigned Inboxes</label>
				<div className="border border-border bg-card rounded p-3 flex flex-col gap-2">
					{(availableInboxes ?? DEFAULT_INBOXES).map((inbox) => {
						const checked = assignedInboxIds.includes(inbox.id);
						return (
							<label key={inbox.id} className="flex items-center gap-2 text-sm text-foreground">
								<input
									type="checkbox"
									checked={checked}
									onChange={(e) => {
										if (e.target.checked) {
											setAssignedInboxIds((prev) => Array.from(new Set([...prev, inbox.id])));
										} else {
											setAssignedInboxIds((prev) => prev.filter((id) => id !== inbox.id));
										}
									}}
									className="accent-primary"
								/>
								<span>{inbox.name}</span>
							</label>
						);
					})}
					{(availableInboxes ?? DEFAULT_INBOXES).length === 0 && (
						<div className="text-xs text-muted-foreground">No inboxes available</div>
					)}
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="flex flex-col gap-1">
					<label className="text-sm font-medium text-foreground">Model</label>
					<select
						value={parameters.model}
						onChange={(e) => updateParameters("model", e.target.value)}
						className="border border-input bg-background text-foreground rounded px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<option value="gpt-4o-mini">gpt-4o-mini</option>
						<option value="gpt-4o">gpt-4o</option>
						<option value="gpt-4.1">gpt-4.1</option>
						<option value="claude-3.5-sonnet">claude-3.5-sonnet</option>
					</select>
				</div>

				<div className="flex flex-col gap-1">
					<label className="text-sm font-medium text-foreground">Temperature: {parameters.temperature.toFixed(2)}</label>
					<input
						type="range"
						min={0}
						max={1}
						step={0.01}
						value={parameters.temperature}
						onChange={(e) => updateParameters("temperature", Number(e.target.value))}
						className="accent-primary"
					/>
				</div>

				<div className="flex flex-col gap-1">
					<label className="text-sm font-medium text-foreground">Max Tokens</label>
					<input
						type="number"
						min={128}
						max={4096}
						step={1}
						value={parameters.maxTokens}
						onChange={(e) => updateParameters("maxTokens", Number(e.target.value))}
						className="border border-input bg-background text-foreground rounded px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					/>
				</div>

				<div className="flex flex-col gap-1">
					<label className="text-sm font-medium text-foreground">Top P</label>
					<input
						type="number"
						min={0}
						max={1}
						step={0.01}
						value={parameters.topP}
						onChange={(e) => updateParameters("topP", Number(e.target.value))}
						className="border border-input bg-background text-foreground rounded px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					/>
				</div>

				<div className="flex flex-col gap-1">
					<label className="text-sm font-medium text-foreground">Tone</label>
					<select
						value={parameters.tone}
						onChange={(e) => updateParameters("tone", e.target.value as AgentTone)}
						className="border border-input bg-background text-foreground rounded px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<option value="professional">Professional</option>
						<option value="friendly">Friendly</option>
						<option value="concise">Concise</option>
						<option value="playful">Playful</option>
					</select>
				</div>
			</div>

			<div className="flex gap-2 justify-end pt-2">
				<button type="button" onClick={onCancel} className="px-3 py-2 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80">
					Cancel
				</button>
				<button
					type="submit"
					disabled={!isValid || isSubmitting}
					className="px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
				>
					{mode === "create" ? (isSubmitting ? "Creating..." : "Create Agent") : (isSubmitting ? "Saving..." : "Save Changes")}
				</button>
			</div>
		</form>
	);
}


