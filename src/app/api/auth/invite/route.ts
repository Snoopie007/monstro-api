import { admindb, db } from "@/db/db";

import { NextRequest, NextResponse } from "next/server";
import { users, vendors } from "@/db/schemas";
import { formatPhoneNumber } from "@/libs/server/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { sales } from "@/db/admin";


export async function POST(req: NextRequest) {
    const { agreeToTerms, saleId, ...data } = await req.json();
    if (!agreeToTerms) {
        return NextResponse.json({ error: "You must agree to the terms and conditions" }, { status: 400 })
    }
    try {
        const user = await db.query.users.findFirst({
            where: (user, { eq }) => eq(user.email, data.email)
        })
        if (user) {
            return NextResponse.json({ error: "User already exists" }, { status: 400 })
        }

        const sale = await admindb.query.sales.findFirst({
            where: (sale, { eq }) => eq(sale.id, saleId)
        })

        if (!sale) {
            return NextResponse.json({ error: "Sale not found" }, { status: 400 })
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);
        await db.transaction(async (tx) => {
            const [{ id }] = await tx.insert(users).values({
                name: `${sale.firstName} ${sale.lastName}`,
                email: sale.email,
                password: hashedPassword,
            }).returning({ id: users.id })

            await tx.insert(vendors).values({
                ...sale,
                phone: formatPhoneNumber(sale.phone),
                userId: id,
            });

        })

        await admindb.update(sales).set({
            agreeToTerms,
        }).where(eq(sales.id, saleId))


        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

