import { db } from "@/db/db";
import { Elysia, t } from "elysia";
import { familyMembers } from "@/db/schemas";
import { eq } from "drizzle-orm";

export function familyRoutes(app: Elysia) {
    app.group("/family", (app) => {
        app.get("/:familyId", async ({ status, params }) => {
            const { familyId } = params;
            try {
                const family = await db.query.familyMembers.findFirst({
                    where: (familyMembers, { eq, and }) =>
                        and(
                            eq(familyMembers.id, familyId),
                            eq(familyMembers.status, 'pending')
                        ),
                    with: {
                        member: {
                            columns: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                            with: {
                                user: {
                                    columns: {
                                        id: true,
                                        name: true,
                                        image: true,
                                    },
                                },
                            },
                        },
                    },
                });


                return status(200, family || {});
            } catch (error) {
                return status(500, { error: "Failed to fetch family" });
            }
        });
        app.patch('/:familyId', async ({ status, params, body }) => {
            const { familyId } = params;
            const { updates } = body;
            try {

                const member = await db.query.members.findFirst({
                    where: (m, { eq }) => eq(m.id, updates.memberId),
                    columns: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        userId: true,
                    },
                });
                if (!member) {
                    return status(400, { error: "Member not found" });
                }


                const [familyMember] = await db.update(familyMembers).set({

                    ...updates,
                    updated: new Date(),
                }).where(eq(familyMembers.id, familyId)).returning();

                if (!familyMember) {
                    return status(500, { error: "Failed to update family member" });
                }
                return status(200, {
                    ...familyMember,
                    member: member,
                });
            } catch (error) {
                console.error(error);
                return status(500, { error: "Failed to accept family member" });
            }
        }, {
            params: t.Object({
                familyId: t.String(),
            }),
            body: t.Object({
                updates: t.Object({
                    memberId: t.String(),
                    status: t.Union([t.Literal("accepted"), t.Literal("declined")]),
                }),
            }),
        });
        return app;
    });
    return app;
}