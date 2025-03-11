
import { auth } from "@/auth";
import { db } from "@/db/db";
import { staffs } from "@/db/schemas";
import { and, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { permission } from "process";


type StaffProps = {
    id: number
}

export async function GET(req: Request, props: { params: Promise<StaffProps> }) {
    const params = await props.params;
    try {
        const staffs = await db.query.staffs.findMany({
            where: (staffs, { eq }) => and(eq(staffs.locationId, params.id), isNull(staffs.deleted)),
            with: {
                role: true
            }
        })
        return NextResponse.json(staffs, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

export async function POST(req: Request, props: { params: Promise<StaffProps> }) {
    const params = await props.params;
    const data = await req.json()
    try {
        const staff = await db.insert(staffs).values({
            ...data,
            locationId: params.id
        }).returning({ id: staffs.id })
        return NextResponse.json(staff, { status: 200 })
    } catch (err) {
        // console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}