import { Elysia } from "elysia";
import S3Bucket from "@/libs/s3";
import { db } from "@/db/db";
import { users } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { members } from "@/db/schemas";
import { z } from "zod";
const s3 = new S3Bucket();

const DeleteProps = {
    params: z.object({
        mid: z.string(),
    }),
};

const PatchProps = {
    ...DeleteProps,
    body: z.object({
        url: z.string(),
    }),
};



export async function memberAvatar(app: Elysia) {
    return app.patch("/avatar", async ({ status, body, params }) => {
        const { mid } = params;
        const { url } = body;
        try {
            const member = await db.query.members.findFirst({
                where: (members, { eq }) => eq(members.id, mid),
            })

            if (!member) {
                return status(404, { message: 'Member not found' });
            }

            if (!member.avatar) {

                await db.transaction(async (tx) => {
                    const [member] = await tx.update(members).set({
                        avatar: url,
                    }).where(eq(members.id, mid)).returning({ userId: members.userId });
                    if (!member) {
                        return await tx.rollback();
                    }
                    await tx.update(users).set({
                        image: url,
                    }).where(eq(users.id, member.userId))
                })
            }



            return status(200, { success: true });
        } catch (error) {
            console.error(error);
            return status(500, { message: 'Something went wrong' });
        }
    }, PatchProps).delete("/avatar", async ({ status, params }) => {
        const { mid } = params;
        try {
            const member = await db.query.members.findFirst({
                where: eq(members.id, mid),
            })
            if (!member) {
                return status(404, { message: 'Member not found' });
            }
            if (member.avatar) {
                const fileName = member.avatar?.split('/').pop() || '';
                await s3.removeFile(`members/${member.id}/avatars`, fileName);
            }
            await db.update(members).set({ avatar: null }).where(eq(members.id, mid));
            return status(200, { success: true });
        } catch (error) {
            console.error(error);
            return status(500, { message: 'Something went wrong' });
        }
    }, DeleteProps)
}