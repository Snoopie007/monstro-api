import { Elysia } from "elysia";
import S3Bucket from "@/libs/s3";
import { db } from "@/db/db";
import { users } from "@subtrees/schemas";
import { eq } from "drizzle-orm";
import { members } from "@subtrees/schemas";
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
                with: {
                    user: true,
                },
            })

            if (!member) {
                return status(404, { message: 'Member not found' });
            }
            const { user } = member;
            if (!user.image) {

                await db.transaction(async (tx) => {

                    await tx.update(users).set({
                        image: url,
                    }).where(eq(users.id, user.id))
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
                with: {
                    user: true,
                },
            })
            if (!member) {
                return status(404, { message: 'Member not found' });
            }
            const { user } = member;
            if (user.image) {
                const fileName = user.image?.split('/').pop() || '';
                await s3.removeFile(`users/${user.id}/images`, fileName);
            }
            await db.update(users).set({ image: null }).where(eq(users.id, user.id));
            return status(200, { success: true });
        } catch (error) {
            console.error(error);
            return status(500, { message: 'Something went wrong' });
        }
    }, DeleteProps)
}