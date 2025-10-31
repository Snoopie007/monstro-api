import { db } from "@/db/db";
import { SupportBotSettingsClient } from "./client";

async function getAssistant(lid: string) {
	try {
		const assistant = await db.query.supportAssistants.findFirst({
			where: (assistant, { eq }) => eq(assistant.locationId, lid),
			with: {
				triggers: true,
			},
		});
		return assistant;
	} catch (error) {
		console.error(error);
		return null;
	}
}

export default async function SupportBotSettingsPage(props: {
	params: Promise<{ id: string }>;
}) {
	const params = await props.params;
	const assistant = await getAssistant(params.id);
	
	return (
		<SupportBotSettingsClient lid={params.id} assistant={assistant} />
	);
}
