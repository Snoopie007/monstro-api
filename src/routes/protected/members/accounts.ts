import { db } from "@/db/db";
import { Elysia, t } from "elysia";
const MemberAccountsProps = {
    params: t.Object({
        mid: t.String(),
    }),
};
export async function memberAccounts(app: Elysia) {

    app.get('/accounts', async ({ params, status }) => {
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
            console.error(error);
            return status(500, { message: "Internal server error", code: "INTERNAL_SERVER_ERROR" });
        }
    }, MemberAccountsProps)

    return app;
}