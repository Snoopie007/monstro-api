import { db } from "@/db/db";

import { NextRequest, NextResponse } from "next/server";
import { users, vendors, vendorLevels, accounts } from "@subtrees/schemas";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import bcrypt from "bcryptjs";
import { generateUsername, generateDiscriminator } from "@/app/api/protected/loc/[id]/members/utils";
import { and, eq } from "drizzle-orm";


export async function POST(req: NextRequest) {
    const data = await req.json();

    if (!data.email || !data.password) {
        return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const normalizedEmail = data.email.trim().toLowerCase();

    try {
        const user = await db.query.users.findFirst({
            where: (user, { eq }) => eq(user.email, normalizedEmail)
        })
        if (user) {
            return NextResponse.json({ error: "User already exists" }, { status: 400 })
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);
        await db.transaction(async (tx) => {
            const [{ id }] = await tx.insert(users).values({
                name: `${data.firstName} ${data.lastName}`,
                email: normalizedEmail,
                username: generateUsername(`${data.firstName} ${data.lastName}`),
                discriminator: generateDiscriminator(),
            }).returning({ id: users.id })

            const credentialAccount = await tx.query.accounts.findFirst({
                where: (account, { and, eq }) => and(
                    eq(account.userId, id),
                    eq(account.provider, "credential")
                ),
                columns: {
                    userId: true,
                },
            });

            if (credentialAccount) {
                await tx.update(accounts).set({
                    password: hashedPassword,
                    type: "email",
                    accountId: normalizedEmail,
                }).where(and(
                    eq(accounts.userId, id),
                    eq(accounts.provider, "credential")
                ));
            } else {
                await tx.insert(accounts).values({
                    userId: id,
                    password: hashedPassword,
                    provider: "credential",
                    type: "email",
                    accountId: normalizedEmail,
                });
            }

            const persistedCredentialAccount = await tx.query.accounts.findFirst({
                where: (account, { and, eq }) => and(
                    eq(account.userId, id),
                    eq(account.provider, "credential")
                ),
                columns: {
                    userId: true,
                },
            });

            if (!persistedCredentialAccount) {
                throw new Error("AUTH_ACCOUNT_CREATE_FAILED");
            }

            const [{ vid }] = await tx.insert(vendors).values({
                ...data,
                phone: parsePhoneNumberFromString(data.phone)?.number,
                userId: id,
                accountOwner: true,
            }).returning({ vid: vendors.id });


            await tx.insert(vendorLevels).values({
                vendorId: vid
            })
        })



        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        if (error instanceof Error && error.message === "AUTH_ACCOUNT_CREATE_FAILED") {
            return NextResponse.json(
                { error: "Unable to create authentication account", code: "AUTH_ACCOUNT_CREATE_FAILED" },
                { status: 500 }
            );
        }

        console.log(error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
