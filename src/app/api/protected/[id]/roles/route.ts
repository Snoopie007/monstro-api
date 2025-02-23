
import { auth } from "@/auth";
import { db } from "@/db/db";
import { roles } from "@/db/schemas";
import { NextResponse } from "next/server";

type RoleProps = {
    id: number
}
export async function GET(req: Request, props: { params: Promise<RoleProps> }) {
    const params = await props.params;

    try {
        const roles = await db.query.roles.findMany({
            where: (roles, { eq }) => eq(roles.locationId, params.id),
            with: {
                permissions: true
            }
        })
        return NextResponse.json(roles, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

export async function POST(req: Request, props: { params: Promise<RoleProps> }) {
    const params = await props.params;
    const data = await req.json()

    try {
        const role = await db.insert(roles).values({
            ...data,
            locationId: params.id
        }).returning({ id: roles.id })
        return NextResponse.json(role, { status: 200 })

    } catch (err) {
        // console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}