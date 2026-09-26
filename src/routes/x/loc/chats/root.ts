import { Elysia, t, type Context } from "elysia";
import { messageRoute } from "./messages";
import { db } from "@/db/db";
import { chatMembers } from "@subtrees/schemas";
import { groupMembers } from "@subtrees/schemas/chat/groups";
import { and, eq, inArray, sql } from "drizzle-orm";

export const xChat = new Elysia({ prefix: "/chats" })
    .get("/", async ({ params, status }) => {
        const { lid } = params;
        try {
            const chats = await db.query.chats.findMany({
                where: (c, { eq }) => eq(c.locationId, lid),
                with: {
                    group: true,
                    chatMembers: {
                        with: {
                            user: true,
                        },
                    },
                },
                orderBy: (c, { desc }) => [desc(c.updated), desc(c.created)],
            });
            // Optional: enrich group member counts for list UI
            const groupIds = chats
                .map((c) => c.groupId)
                .filter((id): id is string => typeof id === "string");

            const memberCounts =
                groupIds.length > 0
                    ? await db
                        .select({
                            groupId: groupMembers.groupId,
                            count: sql<number>`count(*)::int`,
                        })
                        .from(groupMembers)
                        .where(inArray(groupMembers.groupId, groupIds))
                        .groupBy(groupMembers.groupId)
                    : [];

            const memberCountMap = Object.fromEntries(
                memberCounts.map((mc) => [mc.groupId, mc.count]),
            );
            const enriched = chats.map((chat) => ({
                ...chat,
                group: chat.group
                    ? {
                        ...chat.group,
                        memberCount: memberCountMap[chat.group.id] ?? 0,
                        membersPreview: [],
                    }
                    : undefined,
            }));
            return status(200, enriched);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to get chats" });
        }
    }, {
        params: t.Object({
            lid: t.String(),
        }),
    })
    .group("/:cid", (app) => {
        app.patch("/markread", async ({ params, body, status, ...ctx }) => {
            const { cid, lid } = params;
            const uid = (ctx as Context & { userId?: string }).userId;
            const { lastMessageId } = body;
            if (!uid || uid === "service_role") {
                return status(401, { error: "Unauthorized" });
            }
            try {
                if (lid) {
                    const chat = await db.query.chats.findFirst({
                        where: (c, { and, eq }) => and(eq(c.id, cid), eq(c.locationId, lid)),
                        columns: { id: true },
                    });
                    if (!chat) return status(404, { error: "Chat not found" });
                }

                await db.update(chatMembers).set({
                    lastMessageId,
                    unreadCount: 0,
                }).where(and(
                    eq(chatMembers.chatId, cid),
                    eq(chatMembers.userId, uid),
                ));
                return status(200, { success: true });
            } catch (error) {
                console.error(error);
                return status(500, { error: "Internal server error" });
            }
        }, {
            params: t.Object({
                cid: t.String(),
                lid: t.Optional(t.String()),
            }),
            body: t.Object({
                lastMessageId: t.String(),
            }),
        });
        app.use(messageRoute);
        return app;
    });
