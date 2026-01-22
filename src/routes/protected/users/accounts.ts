import { db } from "@/db/db";
import type { Elysia, t } from "elysia";
import { z } from "zod";


const UserAccountsProps = {

    params: z.object({
        uid: z.string(),
    }),
};

export function userAccountsRoutes(app: Elysia) {
    return app.group('/accounts', (app) => {
        app.get('/', async ({ params, status }) => {
            const { uid } = params;
            try {
                const user = await db.query.users.findFirst({
                    where: (u, { eq }) => eq(u.id, uid),
                });

                if (!user) {
                    return status(404, { error: "Member not found" });
                }

                const accounts = await db.query.accounts.findMany({
                    where: (a, { eq }) => eq(a.userId, uid),
                    columns: {
                        provider: true,
                        accountId: true,
                        expires: true,
                        type: true,
                    }
                });

                return status(200, accounts);
            } catch (error) {
                console.error(error);
                return status(500, { error: "Internal server error" });
            }

        }, UserAccountsProps);
        return app;
    });
    return app;
}