import { Elysia, t } from "elysia";
import { db } from "@/db/db";
import { bots } from "@/subtrees/schemas";
import { botMessageRoute } from "@/routes/shared/bots/message";

export const slBots = new Elysia({ prefix: "/bots" })
	.get("/", async ({ params, status }) => {
		const { staffId, lid } = params;
		try {
			const staff = await db.query.staffs.findFirst({
				where: (s, { eq }) => eq(s.id, staffId),
				columns: { userId: true },
			});
			if (!staff) return status(404, { error: "Staff not found" });

			const existing = await db.query.bots.findMany({
				where: (row, { and, eq }) => and(
					eq(row.locationId, lid),
					eq(row.userId, staff.userId),
				),
			});
			if (existing.length > 0) return status(200, existing);

			const created = await db.insert(bots).values({
				locationId: lid,
				userId: staff.userId,
				role: "staff",
				purpose: "member_ops",
				name: "Frank",
			}).returning();
			return status(200, created);
		} catch (error) {
			console.error(error);
			return status(500, { error: "Internal server error" });
		}
	}, {
		params: t.Object({
			staffId: t.String(),
			lid: t.String(),
		}),
	})
	.group("/:botId", (app) => {
		app.use(botMessageRoute);
		return app;
	});
