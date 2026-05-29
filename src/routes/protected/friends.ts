import { db } from "@/db/db"
import { friends } from "@subtrees/schemas";
import type { User } from "@subtrees/types";
import { eq } from "drizzle-orm";

import { Elysia, t } from "elysia";
import type { Context } from "elysia";

export const friendsRoutes = new Elysia({ prefix: '/friends' })
    .get('/', async ({ params, body, status, ...ctx }) => {
        const { userId } = ctx as Context & { userId: string };
        if (!userId) {
            return status(401, { message: "Unauthorized", code: "UNAUTHORIZED" });
        }
        try {
            const friends = await db.query.friends.findMany({
                where: (a, { eq, and }) => and(eq(a.requesterId, userId)),
                with: {
                    addressee: true,
                },
            });

            return status(200, friends);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch friends" });
        }
    })
    .get('/search', async ({ query, status }) => {
        const { type, v } = query;
        console.log(type, v);
        try {
            let users: User[] = [];
            if (type === "email") {
                users = await db.query.users.findMany({

                    where: (u, { eq }) => eq(u.email, v),
                });
            } else if (type === "phone") {
                const m = await db.query.members.findMany({
                    with: {
                        user: true,
                    },
                    where: (m, { eq }) => eq(m.phone, v),
                });
                users = m.map((m) => m.user);
            } else if (type === "username") {
                const [username, discriminator] = v.split("#") as [string, string];

                users = await db.query.users.findMany({
                    where: (u, { eq, and }) => and(eq(u.name, username), eq(u.discriminator, parseInt(discriminator as unknown as string))),
                });
            }
            return status(200, users);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to search friends" });
        }
    }, {
        query: t.Object({
            type: t.String(),
            v: t.String(),
        }),
    })
    .post('/request', async ({ body, status, ...ctx }) => {
        const { addresseeId } = body;
        const { userId } = ctx as Context & { userId: string };
        if (!userId) {
            return status(401, { message: "Unauthorized", code: "UNAUTHORIZED" });
        }
        try {
            const existing = await db.query.friends.findFirst({
                where: (f, { eq, and }) => and(
                    eq(f.requesterId, userId),
                    eq(f.addresseeId, addresseeId)
                ),
            });
            if (existing) {
                return status(400, { error: "Friend request already sent" });
            }
            await db.insert(friends).values({
                requesterId: userId,
                addresseeId: addresseeId,
                status: "pending",
            })

            // notify the addressee
            return status(200, { success: true });
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to request friend" });
        }
    }, {
        body: t.Object({
            addresseeId: t.String(),
        }),
    })
    .group('/request/:friendId', (app) => {
        app.post('/accept', async ({ body, status, ...ctx }) => {
            const { friendId } = ctx.params;

            try {
                const friend = await db.query.friends.findFirst({
                    where: (f, { eq }) => eq(f.id, friendId),
                });
                if (!friend) {
                    return status(400, { error: "Friend not requested" });
                }
                await db.update(friends).set({
                    status: "accepted",
                }).where(eq(friends.id, friendId));
                // notify the requester
                return status(200, { success: true });
            } catch (error) {
                console.error(error);
                return status(500, { error: "Failed to accept friend" });
            }
        })
        app.post('/decline', async ({ body, status, ...ctx }) => {
            const { friendId } = ctx.params;
            try {
                const friend = await db.query.friends.findFirst({
                    where: (f, { eq }) => eq(f.id, friendId),
                });
                if (!friend) {
                    return status(400, { error: "Friend not requested" });
                }
                await db.update(friends).set({
                    status: "blocked",
                }).where(eq(friends.id, friendId));
                // notify the requester
                return status(200, { success: true });
            } catch (error) {
                console.error(error);
                return status(500, { error: "Failed to reject friend" });
            }
        })
        app.delete('/', async ({ body, status, ...ctx }) => {
            const { friendId } = ctx.params;
            try {

                await db.delete(friends).where(eq(friends.id, friendId));
                // notify the requester
                return status(200, { success: true });
            } catch (error) {
                console.error(error);
                return status(500, { error: "Failed to cancel friend request" });
            }
        })
        return app;
    })
