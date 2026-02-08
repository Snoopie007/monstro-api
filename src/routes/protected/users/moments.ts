import { db } from "@/db/db";
import { Elysia } from "elysia";
import { moments, userFeeds } from "@subtrees/schemas";
import { z } from "zod";

const GetMomentsProps = {
    params: z.object({
        uid: z.string(),
    }),
};

// Fix: Remove 'files' from body since only 'content' is handled
const PostMomentsProps = {
    ...GetMomentsProps,
    body: z.object({
        content: z.string(),
    }),
};

export function userMomentsRoutes(app: Elysia) {
    app.get("/moments", async ({ params, status }) => {
        const { uid } = params;
        try {
            const momentsList = await db.query.moments.findMany({
                where: (moments, { eq }) => eq(moments.userId, uid),
                with: {
                    author: true,
                    comments: {
                        with: {
                            user: true,
                        },
                    }
                },
                orderBy: (moments, { desc }) => desc(moments.created),
            });
            return status(200, momentsList);
        } catch (error) {
            console.error("Error fetching moments feed:", error);
            return status(500, { error: "Failed to fetch moments feed" });
        }
    }, GetMomentsProps);

    // Elysia expects the function to return the group, so must return the inner app!
    app.post("/moments", async ({ params, body, status }) => {
        const { uid } = params;
        const { content } = body;

        try {

            const author = await db.query.users.findFirst({
                where: (users, { eq }) => eq(users.id, uid),
                columns: {
                    id: true,
                    name: true,
                    image: true,
                }
            });
            if (!author) {
                return status(404, { error: "Author not found" });
            }

            const [moment] = await db.insert(moments).values({
                userId: uid,
                content,
            }).returning();

            if (!moment) {
                return status(500, { error: "Failed to create moment" });
            }

            const friends = await db.query.friends.findMany({
                where: (friends, { eq }) => eq(friends.requesterId, uid),
            });


            const friendIds = friends.map(friend => friend.addresseeId);

            await db.insert(userFeeds).values(friendIds.map(id => ({
                userId: id,
                momentId: moment.id,
                authorId: uid,
            })));
            // notify friends



            return status(201, {
                ...moment,
                author: author,
            });
        } catch (error) {
            console.error("Error posting moment:", error);
            return status(500, { error: "Failed to post moment" });
        }
    }, PostMomentsProps);

    return app;
}