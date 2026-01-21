import { db } from "@/db/db";

import { NextRequest, NextResponse } from "next/server";
import { users, vendors, vendorLevels, accounts } from "@/db/schemas";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import bcrypt from "bcryptjs";
import { generateUsername, generateDiscriminator } from "@/app/api/protected/loc/[id]/members/utils";
import { eq } from "drizzle-orm";


export async function POST(req: NextRequest) {
    const data = await req.json();

    if (!data.email || !data.password) {
        return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const normalizedEmail = data.email.toLowerCase();

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

            await tx.update(accounts).set({
                password: hashedPassword,
            }).where(eq(accounts.userId, id))

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
        console.log(error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

