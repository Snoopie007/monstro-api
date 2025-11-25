import { db } from "@/db/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const data = await req.json();
    const { email } = data;
    const normalizedEmail = email.toLowerCase();
    try {
        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 })
        }
        const vendor = await db.query.users.findFirst({
            where: (user, { eq }) => eq(user.email, normalizedEmail)
        })
        if (vendor) {
            return NextResponse.json({ error: "Email already exists" }, { status: 400 })
        }
        return NextResponse.json({ success: true }, { status: 200 })
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
    }
}