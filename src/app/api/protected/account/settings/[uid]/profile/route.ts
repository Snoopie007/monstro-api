import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { staffs, vendors } from "@subtrees/schemas";
import { auth } from "@/libs/auth/server";
import { eq } from "drizzle-orm";

export async function PUT(req: NextRequest, props: { params: Promise<{ uid: string }> }) {
    const { uid } = await props.params;
    const isVendor = uid.startsWith('vdr_');
    const body = await req.json();
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    try {

        if (isVendor) {
            await db.update(vendors)
                .set({
                    ...body,
                    updated: new Date()
                })
                .where(eq(vendors.id, uid))
        } else {
            const staffId = Number(uid);
            if (!Number.isInteger(staffId)) {
                return NextResponse.json({ error: "Staff not found." }, { status: 404 });
            }
            await db.update(staffs)
                .set({
                    ...body,
                    updated: new Date()
                })
                .where(eq(staffs.id, staffId))
        }


        return NextResponse.json({
            success: true,
        }, {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Error updating vendor:", error);
        return NextResponse.json({ error: "Failed to update vendor." }, { status: 500 });
    }
}
