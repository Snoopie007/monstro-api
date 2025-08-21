import React from "react";
import AgentsDashboard from "@/app/dashboard/location/[id]/ai/AgentsDashboard";

export default async function AIBotsPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params;
    // NOTE: This is a mock UI only. In the server version, we'd fetch and validate the location
    // with a server component. For now, render the client dashboard.
    return (
        <div className='flex flex-row h-[calc(100vh-50px)] w-full bg-background text-foreground'>
            <AgentsDashboard locationId={id} />
        </div>
    )
}
