import { db } from '@/db/db';
import { users } from '@/db/schemas';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import Elysia from 'elysia';
type ResetPasswordBody = {
    currentPassword: string;
    newPassword: string;
    mid: string;
    uid: string;
}
export async function resetPassword(app: Elysia) {
    return app.post("/password", async ({ body, status }) => {
        const { currentPassword, newPassword, mid, uid } = body as ResetPasswordBody;


        const member = await db.query.members.findFirst({
            where: (member, { eq }) => eq(member.id, mid)
        })
        if (!member) {
            return status(404, { error: "Member not found" })
        }

        try {
            const user = await db.query.users.findFirst({
                where: (user, { eq }) => eq(user.id, uid)
            })

            if (!user) {
                return status(404, { error: "User not found" })
            }

            if (!user.password) {
                return status(401, { error: "User has no password" })
            }

            const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isPasswordValid) {
                return status(401, { error: "Invalid password" })
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await db.update(users).set({ password: hashedPassword }).where(eq(users.id, user.id));

            return status(200, { success: true })


        } catch (err) {
            console.log(err)
            return status(500, { error: err })
        }
    });
}
