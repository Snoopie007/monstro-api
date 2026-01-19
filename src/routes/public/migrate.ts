import { db } from "@/db/db"
import { accounts, importMembers, memberLocations, members, users } from "@/db/schemas";
import { generateReferralCode } from "@/libs/utils";
import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia"
import bcrypt from "bcryptjs";
import type { Member } from "@/types/member";

const MigrateProps = {
    params: t.Object({
        migrateId: t.String(),
    }),
}

export const migrationRoutes = new Elysia({ prefix: '/migrate' })
    .group('/:migrateId', (app) => {
        app.get('/', async ({ params, status }) => {
            const { migrateId } = params;
            try {
                const migrate = await db.query.importMembers.findFirst({
                    where: (importMembers, { eq }) => eq(importMembers.id, migrateId),
                    with: {
                        location: true,
                        pricing: true,
                    },
                });
                if (!migrate) {
                    return status(404, { error: "Migrate not found" });
                }
                return status(200, migrate);
            } catch (error) {
                return status(500, { error: "Failed to get migrate" });
            }
        }, MigrateProps);


        app.post('/', async ({ params, status, body }) => {
            const { migrateId } = params;
            const { lid, password, firstName, lastName, email, phone } = body;
            const today = new Date();
            try {
                let member: Member | undefined;

                // Look for existing member with this email at the given location
                member = await db.query.members.findFirst({
                    where: (m, { eq }) => eq(m.email, email),
                    with: {
                        memberLocations: {
                            where: (ml, { eq }) => eq(ml.locationId, lid),
                        }
                    }
                });

                if (member && member.memberLocations && member.memberLocations.length > 0) {
                    return status(200, member);
                }

                const existingUser = await db.query.users.findFirst({
                    where: (u, { eq }) => eq(u.email, email)
                });

                await db.transaction(async (tx) => {
                    let userId = existingUser ? existingUser.id : undefined;

                    if (!userId) {
                        const hashedPassword = await bcrypt.hash(password, 10);
                        const [user] = await tx
                            .insert(users)
                            .values({
                                name: `${firstName} ${lastName}`,
                                email,
                            })
                            .returning({ uid: users.id });

                        if (!user) {
                            await tx.rollback();
                            return;
                        }
                        await tx.insert(accounts).values({
                            userId: user.uid,
                            provider: "credentials",
                            accountId: email,
                            password: hashedPassword,
                        });
                        userId = user.uid;
                    }

                    if (!member) {
                        const [newMember] = await tx
                            .insert(members)
                            .values({
                                firstName,
                                lastName,
                                email,
                                phone: phone ?? null,
                                userId: userId,
                                referralCode: generateReferralCode(),
                            }).returning();
                        if (!newMember) {
                            await tx.rollback();
                            return;
                        }
                        member = newMember as Member;
                    }
                    const newMemberLocation = await tx.insert(memberLocations).values({
                        memberId: member.id,
                        locationId: lid,
                        inviteAcceptedDate: today,
                        status: "incomplete",
                        updated: today,
                    }).returning();
                    if (!newMemberLocation) {
                        await tx.rollback();
                        return;
                    }

                    member.memberLocations = newMemberLocation;
                    await tx.update(importMembers).set({
                        memberId: member.id,
                        status: "processing",
                        acceptedAt: today,
                        updated: today,
                    }).where(eq(importMembers.id, migrateId));
                });

                return status(200, member);
            } catch (error) {
                console.log(error);
                return status(500, { error: "Failed to migrate" });
            }
        },
            {
                ...MigrateProps,
                body: t.Object({
                    password: t.String(),
                    lid: t.String(),
                    firstName: t.String(),
                    lastName: t.String(),
                    email: t.String(),
                    phone: t.Optional(t.String()),
                }),
            }
        );
        return app;
    });