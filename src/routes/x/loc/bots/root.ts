import { Elysia, t, type Context } from "elysia";
import { db } from "src/db/db";
import { bots } from "subtrees/schemas";
import { botMessageRoute } from "src/routes/shared/bots/message";

export const xBots = new Elysia({ prefix: "/bots" })
	.get("/", async (ctx) => {
		const { lid } = ctx.params as { lid: string };
		const { userId, userRole, status } = ctx as Context & {
			userId?: string;
			userRole?: string;
		};
		const bts = await db.query.bots.findMany({
			where: (bots, { and, eq }) => and(
				eq(bots.locationId, lid),
				eq(bots.userId, userId ?? ""),
			),
		});
		if (bts.length > 0) return bts;

		const newBot = await db.insert(bots).values({
			locationId: lid,
			userId: userId ?? "",
			role: userRole === "staff" ? "staff" : "vendor",
			purpose: "member_ops",
			name: "Chief Operations Officer",
		}).returning();
		return [newBot];
	}, {
		params: t.Object({
			lid: t.String(),
		}),
	})
	.group("/:botId", (app) => {

		app.use(botMessageRoute);
		return app;
	});
