import { migrateMembers } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "@/db/db";
import { members, users, accounts } from "@/db/schemas";
import { generateReferralCode } from "@/libs/utils";
import bcrypt from "bcryptjs";
import type { Member } from "@/types/member";

export async function mobileRegister(app: Elysia) {
    app.post('/register', async ({ status, body }) => {
        const { password, firstName, lastName, email, migrateId, phone } = body;
        const today = new Date();
        try {
            let member: Member | undefined;

            // Look for existing member with this email at the given location
            member = await db.query.members.findFirst({
                where: (m, { eq }) => eq(m.email, email),
                with: {
                    user: true
                }
            });

            let user = member?.user;
            if (!user) {
                user = await db.query.users.findFirst({
                    where: (u, { eq }) => eq(u.email, email),

                });
            }

            await db.transaction(async (tx) => {

                if (!user) {
                    const hashedPassword = await bcrypt.hash(password, 10);
                    const [newUser] = await tx.insert(users).values({
                        name: `${firstName} ${lastName}`,
                        email,
                    }).returning();

                    if (!newUser) {
                        console.log("Failed to create user");
                        await tx.rollback();
                        return;
                    }
                    await tx.insert(accounts).values({
                        userId: newUser.id,
                        provider: "credential",
                        type: 'email',
                        accountId: email,
                        password: hashedPassword,
                    });
                    user = newUser;
                }

                if (!member) {
                    const [newMember] = await tx
                        .insert(members)
                        .values({
                            firstName,
                            lastName,
                            email,
                            userId: user.id,
                            referralCode: generateReferralCode(),
                        }).returning();
                    if (!newMember) {
                        console.log("Failed to create member");
                        await tx.rollback();
                        return;
                    }
                    member = newMember;
                }
                if (migrateId) {
                    await tx.update(migrateMembers).set({
                        memberId: member?.id,
                        viewedOn: today,
                        updated: today,
                    }).where(eq(migrateMembers.id, migrateId));
                }

            });

            return status(200, member);
        } catch (error) {
            console.log(error);
            return status(500, { error: "Failed to migrate" });
        }
    }, {
        body: t.Object({
            password: t.String(),
            firstName: t.String(),
            lastName: t.String(),
            email: t.String(),
            migrateId: t.String(),
            phone: t.Optional(t.String()),
            referralCode: t.Optional(t.String()),
        }),
    });
    return app;
}


