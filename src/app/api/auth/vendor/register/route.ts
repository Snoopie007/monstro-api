import { db } from "@/db/db";

import { NextRequest, NextResponse } from "next/server";
import { users, vendors } from "@/db/schemas";
import { formatPhoneNumber, hashPassword } from "@/libs/server/db";


export async function POST(req: NextRequest) {
    const data = await req.json();

    try {
        const user = await db.query.users.findFirst({
            where: (user, { eq }) => eq(user.email, data.email)
        })
        if (user) {
            return NextResponse.json({ error: "User already exists" }, { status: 400 })
        }
        // Format phone number (ToDo)
        // const salt = await bcrypt.genSalt(10);
        // const hashedPassword: string = await bcrypt.hash(data.password, salt);

        const hashedPassword = await hashPassword(data.password);
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



        // const res = await fetch(`${process.env.GHL_URL}/contacts/`, {
        //     method: "POST",
        //     headers: {
        //         'Content-type': 'application/json',
        //         "Authorization": `Bearer ${process.env.GHL_KEY}`,
        //     },
        //     body: JSON.stringify({
        //         firstName: vendor.firstName,
        //         lastName: vendor.lastName,
        //         phone: vendor.phone,
        //         email: vendor.email,
        //         source: "Website Form",
        //         tags: ["Customer"],
        //         locationId: "rCcWpfkx9wZlMF7P4C5V",
        //         customFields: [
        //             { key: "sales_rep", field_value: rep },
        //             { key: "plan_type", field_value: plan.name }
        //         ]
        //     })
        // });


        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

