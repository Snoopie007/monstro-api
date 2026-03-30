import { db } from "@/db/db";
import type { MemberRelationship } from "@subtrees/types";
import { Elysia, t } from "elysia";
import { familyMembers } from "subtrees/schemas";



const INVERSE_RELATIONSHIP: Record<string, MemberRelationship> = {
    parent: "child",
    spouse: "spouse",
    child: "parent",
    sibling: "sibling",
    extended: "extended",
}

export function familyRoutes(app: Elysia) {
    app.group("/family", (app) => {
        app.post("/join", async ({ status, body, params }) => {
            const { memberId, relatedMemberId, relationship } = body;
            try {
                if (relatedMemberId === memberId) {
                    return status(400, { error: "You cannot add yourself as a family member" });
                }

                await db.transaction(async (tx) => {
                    await tx.insert(familyMembers).values({
                        memberId,
                        relatedMemberId,
                        relationship: relationship as MemberRelationship,
                    }).onConflictDoNothing({
                        target: [familyMembers.memberId, familyMembers.relatedMemberId],
                    })
                    await tx.insert(familyMembers).values({
                        memberId: relatedMemberId,
                        relatedMemberId: memberId,
                        relationship: INVERSE_RELATIONSHIP[relationship],
                    }).onConflictDoNothing({
                        target: [familyMembers.memberId, familyMembers.relatedMemberId],
                    })
                });
                return status(200, { success: true });
            } catch (error) {
                console.error(error);
                return status(500, { error: "Failed to add family member" });
            }
        }, {
            body: t.Object({
                relationship: t.String(),
                relatedMemberId: t.String(),
                memberId: t.String(),
            }),
        });
        app.get("/join/:code/related", async ({ status, params }) => {
            const { code } = params;
            try {
                const family = await db.query.members.findFirst({
                    where: (m, { eq }) => eq(m.familyInviteCode, code),
                    columns: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        userId: true,
                    },
                    with: {
                        user: {
                            columns: {
                                image: true,
                            },
                        },
                    },
                });
                if (!family) {
                    return status(404, { error: "Family not found" });
                }
                return status(200, family);
            } catch (error) {
                console.error(error);
                return status(500, { error: "Failed to fetch family" });
            }
        }, { params: t.Object({ code: t.String() }) });
        return app;
    });
    return app;
}