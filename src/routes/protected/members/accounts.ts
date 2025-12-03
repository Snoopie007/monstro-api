import { db } from "@/db/db";
import { Elysia } from "elysia";
import { z } from "zod";
const MemberAccountsProps = {
    params: z.object({
        mid: z.string(),
    }),
};
export async function memberAccounts(app: Elysia) {
    return app.get('/accounts', async ({ params, status }) => {
        const { mid } = params;
        try {
            const member = await db.query.members.findFirst({
                where: (m, { eq }) => eq(m.id, mid),
            });

            if (!member) {
                return status(404, { error: "Member not found" });
            }

            const accounts = await db.query.accounts.findMany({
                where: (a, { eq }) => eq(a.userId, member.userId),
                columns: {
                    provider: true,
                    accountId: true,
                    expiresAt: true,
                }
            });

            return status(200, accounts);

        } catch (error) {
            return status(401, { error: "Unauthorized" });
        }
    }, MemberAccountsProps)
}