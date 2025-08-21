"use client";
import React, { useMemo, useState } from "react";
import type { Agent } from "@/types/ai";
import AgentForm from "@/app/dashboard/location/[id]/ai/AgentForm";
import Link from "next/link";

export interface AgentsDashboardProps {
	locationId: string;
}

const MOCK_AGENTS: Agent[] = [
	{
		id: "a1",
		name: "Front Desk Assistant",
		systemPrompt: "You are the front desk AI for our location. Be concise and helpful.",
		parameters: {
			model: "gpt-4o-mini",
			temperature: 0.5,
			maxTokens: 800,
			topP: 1,
			tone: "professional",
		},
		assignedInboxIds: ["inbox-1"],
		isActive: true,
	},
	{
		id: "a2",
		name: "Sales Concierge",
		systemPrompt: "You are a sales-oriented assistant. Provide friendly, upbeat responses and guide to purchase.",
		parameters: {
			model: "gpt-4o",
			temperature: 0.7,
			maxTokens: 1000,
			topP: 1,
			tone: "friendly",
		},
		assignedInboxIds: ["inbox-2"],
		isActive: false,
	},
];

export default function AgentsDashboard({ locationId }: AgentsDashboardProps) {
	const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS);
	const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agents[0]?.id ?? null);

	const selectedAgent = useMemo(() => agents.find((a) => a.id === selectedAgentId) ?? null, [agents, selectedAgentId]);

	// Navigation handled by Link in the UI now.

	function handleSave(agent: Agent) {
		console.log("[AgentsDashboard] save agent:", agent);
		setAgents((prev) => prev.map((a) => (a.id === agent.id ? agent : a)));
	}

	function handleDelete(agentId: string) {
		// TODO backend: DELETE /api/locations/:id/agents/:agentId
		console.log("[AgentsDashboard] delete agent:", agentId);
		setAgents((prev) => prev.filter((a) => a.id !== agentId));
		if (selectedAgentId === agentId) {
			setSelectedAgentId(prev => {
				const remaining = agents.filter((a) => a.id !== agentId);
				return remaining[0]?.id ?? null;
			});
		}
	}

	return (
		<div className="flex flex-row h-full w-full bg-background text-foreground">
			<div className="w-full md:w-80 border-r border-border h-full flex flex-col bg-card">
				<div className="p-3 flex items-center justify-between border-b border-border">
					<div className="font-semibold">Agents</div>
					<Link href={`/dashboard/location/${locationId}/ai/create`} className="px-2 py-1 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90">New</Link>
				</div>
				<div className="overflow-auto">
					{agents.length === 0 ? (
						<div className="p-3 text-sm text-muted-foreground">No agents yet.</div>
					) : (
						<ul>
							{agents.map((agent) => (
								<li key={agent.id}>
									<button
										className={`w-full text-left px-3 py-2 hover:bg-muted ${selectedAgentId === agent.id ? "bg-muted" : ""}`}
										onClick={() => setSelectedAgentId(agent.id)}
									>
										<div className="font-medium text-sm">{agent.name}</div>
										<div className="text-xs text-muted-foreground">{agent.parameters.model} • {agent.isActive ? "Active" : "Inactive"}</div>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>

			<div className="flex-1 h-full overflow-auto">
				{selectedAgent ? (
					<div className="p-4">
						<div className="flex items-center justify-between pb-3 border-b border-border">
							<h2 className="text-lg font-semibold">Edit Agent</h2>
							<div className="flex gap-2">
								<button
									onClick={() => handleDelete(selectedAgent.id)}
									className="px-3 py-2 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"
								>
									Delete
								</button>
							</div>
						</div>
						<div className="pt-4 max-w-3xl">
							<AgentForm
								mode="edit"
								initialAgent={selectedAgent}
								onSubmit={handleSave}
								onCancel={() => console.log("[AgentsDashboard] cancel edit")}
							/>
						</div>
					</div>
				) : (
					<div className="h-full w-full grid place-items-center text-muted-foreground">Select an agent</div>
				)}
			</div>
		</div>
	);
}


