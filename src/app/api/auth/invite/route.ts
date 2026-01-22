import { admindb, db } from "@/db/db";

import { NextRequest, NextResponse } from "next/server";
import { users, vendors, vendorLevels, accounts } from "@/db/schemas";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { sales } from "@/db/admin";
import { generateUsername, generateDiscriminator } from "@/app/api/protected/loc/[id]/members/utils";


export async function POST(req: NextRequest) {
    const { agreeToTerms, saleId, ...data } = await req.json();
    if (!agreeToTerms) {
        return NextResponse.json({ error: "You must agree to the terms and conditions" }, { status: 400 })
    }

    const normalizedEmail = data.email.toLowerCase();
    try {
        const user = await db.query.users.findFirst({
            where: (user, { eq }) => eq(user.email, normalizedEmail)
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

        const { id, ...rest } = sale;

        await db.transaction(async (tx) => {

            const name = `${sale.firstName} ${sale.lastName}`;
            const [{ id }] = await tx.insert(users).values({
                name: name,
                email: sale.email,
                username: generateUsername(name),
                discriminator: generateDiscriminator(),
            }).onConflictDoNothing(
                { target: [users.email] }
            ).returning({ id: users.id })

            if (!id) {

                tx.rollback();
                return
            }


            await tx.insert(accounts).values({
                userId: id,
                password: hashedPassword,
                provider: "credential",
                type: "email",
                accountId: sale.email,
            })

            const [{ vid }] = await tx.insert(vendors).values({
                ...rest,
                phone: parsePhoneNumberFromString(sale.phone)?.number,
                userId: id,
            }).onConflictDoNothing(
                { target: [vendors.email] }
            ).returning({ vid: vendors.id });

            if (!vid) {
                tx.rollback();
                return
            }

            await tx.insert(vendorLevels).values({
                vendorId: vid
            });
        })

        await admindb.update(sales).set({
            agreedToTerms: true,
        }).where(eq(sales.id, saleId))


        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

