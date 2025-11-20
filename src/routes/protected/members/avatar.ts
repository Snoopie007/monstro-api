import { Elysia } from "elysia";
import S3Bucket from "@/libs/s3";
import { db } from "@/db/db";
import { users } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { members } from "@/db/schemas";

const s3 = new S3Bucket();


export async function memberAvatar(app: Elysia) {
    return app.patch("/profile/avatar", async ({ status, body, params }) => {
        const { mid } = params as { mid: string };
        const form = body as FormData;
        const file = form.get('file') as File;

        if (!file) {
            return status(400, { message: 'No file uploaded' });
        }


        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];


        if (!allowedTypes.includes(file.type)) {
            return status(400, {
                message: 'Invalid file type. Only JPEG and PNG are allowed.'
            });
        }

        // Validate file size (2.5MB max)
        const maxSize = 2.5 * 1024 * 1024;
        if (file.size > maxSize) {
            return status(400, {
                message: 'File too large. Maximum size is 2.5MB.'
            });
        }

        try {

            const member = await db.query.members.findFirst({
                where: (members, { eq }) => eq(members.id, mid),
            })

            if (!member) {
                return status(404, { message: 'Member not found' });
            }


            if (member.avatar) {
                const fileName = member.avatar?.split('/').pop() || '';
                await s3.removeFile(`members/${member.id}/avatars`, fileName);
            }


            const res = await s3.uploadFile(file, `members/${member.id}/avatars`);

            const url = res?.url || null;

            if (!url) {
                return status(500, { message: 'Failed to upload file' });
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



            return status(200, { url });
        } catch (error) {
            console.error(error);
            return status(500, { message: 'Something went wrong' });
        }
    })
}