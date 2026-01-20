import { db } from '@/db/db';
import { accounts, users } from '@/db/schemas';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import Elysia from 'elysia';
import { z } from 'zod';

const ResetPasswordProps = {
    body: z.object({
        currentPassword: z.string(),
        newPassword: z.string(),
        mid: z.string(),
        uid: z.string(),
    }),
};
export async function resetPassword(app: Elysia) {
    return app.post("/password", async ({ body, status }) => {
        const { currentPassword, newPassword, mid, uid } = body;


        const member = await db.query.members.findFirst({
            where: (member, { eq }) => eq(member.id, mid)
        })
        if (!member) {
            return status(404, { error: "Member not found" })
        }

        try {
            const account = await db.query.accounts.findFirst({
                where: (account, { eq, and }) => and(eq(account.userId, uid), eq(account.provider, "credential"))
            })

            if (!account) {
                return status(404, { error: "Account not found" })
            }

            if (!account.password) {
                return status(404, { error: "Account has no password" })
            }

            const isPasswordValid = await bcrypt.compare(currentPassword, account.password);
            if (!isPasswordValid) {
                return status(401, {
                    message: "Invalid password",
                    code: "INVALID_PASSWORD"
                })
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await db.update(accounts).set({ password: hashedPassword }).where(eq(accounts.userId, uid));

            return status(200, { success: true })


        } catch (err) {
            console.log(err)
            return status(500, { error: err })
        }
    }, ResetPasswordProps);
}
