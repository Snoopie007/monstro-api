
import { auth } from "@/auth";
import { db } from "@/db/db";
import { and, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { permission } from "process";

export async function GET(req: Request, props: { params: Promise<{ id: number }> }) {
    const params = await props.params;
    const session = await auth();
    try {
        if (session) {
            const staffs = await db.query.staffs.findMany({
                where: (staffs, {eq}) => and(eq(staffs.locationId,params.id), isNull(staffs.deleted)),
                with: {
                    role: true
                }
            })
            return NextResponse.json(staffs, { status: 200 });
        }
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await auth();
    const data = await req.json()
    try {

		if (session) {

			const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/staffs`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${session.user.token}`,
					"locationId": `${params.id}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(data)
			})
            console.log(res)
			if (!res.ok) {
				return NextResponse.json({ message: "An error occurred inviting staff." }, { status: 400 });
			}

			return NextResponse.json({ message: "Success" }, { status: 200 });
		}
	} catch (err) {
		// console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}