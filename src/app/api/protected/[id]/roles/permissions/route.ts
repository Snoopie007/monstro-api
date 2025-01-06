
import { auth } from "@/auth";
import { db } from "@/db/db";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await auth();
    try {
        if (session) {

          const permissions = await db.query.permissions.findMany({})

          return NextResponse.json(permissions, { status: 200 });
        }
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 })
    }
}