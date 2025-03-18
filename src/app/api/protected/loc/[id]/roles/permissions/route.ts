
import { db } from "@/db/db";
import { NextResponse } from "next/server";

export async function GET() {

    try {
        const permissions = await db.query.permissions.findMany({})

        console.log(permissions)

        return NextResponse.json(permissions, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 })
    }
}