import { Elysia, t } from "elysia";
import { db } from "@/db/db";
import { streamBotAgent } from "./bot";

const params = t.Object({
	lid: t.String(),
	botId: t.String(),
	staffId: t.Optional(t.String()),
});

const messageBody = t.Object({
	message: t.String({ minLength: 1, maxLength: 40000 }),
	mentions: t.Optional(t.Array(t.Object({
		id: t.String({ minLength: 1, maxLength: 80 }),
		label: t.String({ minLength: 1, maxLength: 200 }),
	}))),
});

export function botMessageRoute(app: Elysia) {
	app.get("/messages", async ({ params, status }) => {
		const { lid, botId } = params;
		try {
			const bot = await db.query.bots.findFirst({
				where: (row, { and, eq }) => and(
					eq(row.id, botId),
					eq(row.locationId, lid),
				),
				columns: { id: true },
			});
			if (!bot) return status(404, { error: "Bot not found" });

			const messages = await db.query.botMessages.findMany({
				where: (row, { eq }) => eq(row.botId, botId),
				orderBy: (row, { asc }) => [asc(row.created)],
			});
			return status(200, messages);
		} catch (error) {
			console.error(error);
			return status(500, { error: "Internal server error" });
		}
	}, { params });

	app.post("/message", async ({ params, body, status, request }) => {
		const result = await streamBotAgent({
			lid: params.lid,
			botId: params.botId,
			message: body.message,
			mentions: body.mentions,
			request,
		});
		if (result instanceof Response) return result;
		return status(result.status, result.body);
	}, { params, body: messageBody });

	return app;
}
