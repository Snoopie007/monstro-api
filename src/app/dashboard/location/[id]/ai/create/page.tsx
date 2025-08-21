"use client";
import React from "react";
import AgentForm from "@/app/dashboard/location/[id]/ai/AgentForm";
import type { Agent } from "@/types/ai";
import { useRouter, useParams } from "next/navigation";

export default function CreateAgentPage() {
	const router = useRouter();
	const params = useParams();
	const locationId = String(params?.id);

	function handleCancel() {
		// Navigate back to AI dashboard
		router.push(`/dashboard/location/${locationId}/ai`);
	}

	function handleSubmit(agent: Agent) {
		// TODO backend: POST /api/locations/:id/agents
		console.log("[CreateAgentPage] create agent:", agent);
		// After success, navigate back to AI dashboard
		router.push(`/dashboard/location/${locationId}/ai`);
	}

	return (
		<div className="p-4 w-full h-[calc(100vh-50px)] overflow-auto bg-background text-foreground">
			<div className="max-w-3xl">
				<h1 className="text-xl font-semibold pb-4">Create Agent</h1>
				<AgentForm mode="create" onCancel={handleCancel} onSubmit={handleSubmit} />
			</div>
		</div>
	);
}


