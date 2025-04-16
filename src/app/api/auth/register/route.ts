import { db } from "@/db/db";

import { NextRequest, NextResponse } from "next/server";
import { users, vendors } from "@/db/schemas";
import { formatPhoneNumber } from "@/libs/server/db";
import bcrypt from "bcryptjs";


export async function POST(req: NextRequest) {
    const data = await req.json();

    try {
        const user = await db.query.users.findFirst({
            where: (user, { eq }) => eq(user.email, data.email)
        })
        if (user) {
            return NextResponse.json({ error: "User already exists" }, { status: 400 })
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);
        await db.transaction(async (tx) => {
            const [{ id }] = await tx.insert(users).values({
                name: `${data.firstName} ${data.lastName}`,
                email: data.email,
                password: hashedPassword,
            }).returning({ id: users.id })

            await tx.insert(vendors).values({
                ...data,
                phone: formatPhoneNumber(data.phone),
                userId: id,
                accountOwner: true,
            })
        })



        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

