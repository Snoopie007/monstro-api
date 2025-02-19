import { db } from "@/db/db";
import { decodeId, encodeId } from "@/libs/server/sqids";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const data = await req.json();

    try {
        const user = await db.query.users.findFirst({
            where: (user, { eq }) => eq(user.email, data.email),
            with: {
                vendor: true
            }
        })

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        if (!user.vendor.onboarding.completed) {
            return NextResponse.json({ lid: null }, { status: 200 });
        }

        let location = null;

        if (data.lid) {
            console.log("Given ID", data.lid);
            const decodedId = decodeId(data.lid);
            location = await db.query.locations.findFirst({
                where: (locations, { eq, and }) => and(eq(locations.vendorId, user.vendor.id), eq(locations.id, decodedId)),
                columns: {
                    id: true
                }
            })

        }

        if (!location) {
            console.log("In Correct ID, location found");
            location = await db.query.locations.findFirst({
                where: (locations, { eq, and }) => and(eq(locations.vendorId, user.vendor.id), eq(locations.status, 'Active')),
                columns: {
                    id: true
                }
            })
        }

        if (!location) {
            return NextResponse.json({ lid: null }, { status: 200 });
        }


        return NextResponse.json({ lid: encodeId(location.id) }, { status: 200 })

    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

