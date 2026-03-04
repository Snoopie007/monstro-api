import { db } from "@/db/db";
import { users } from "@subtrees/schemas";
import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";

export function userOnlineStatusRoutes(app: Elysia) {
    app.post('/online', async ({ status, params, body }) => {
        const { uid } = params;
        const { state } = body;
        try {

            await db.update(users).set({
                isOnline: state,
            }).where(eq(users.id, uid));


            return status(200, { success: true });
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal server error" });
        }


    }, {
        params: t.Object({
            uid: t.String(),
        }),
        body: t.Object({
            state: t.Boolean(),
        }),
    });
    return app;
}