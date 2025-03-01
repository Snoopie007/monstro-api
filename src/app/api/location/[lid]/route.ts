

import { db } from "@/db/db";
import { decodeId } from "@/libs/server/sqids";
import { NextRequest, NextResponse } from "next/server";

/**
 * @description Get the location progress and status this is required because next auth we cannot run db queries in the callback
 * @param req - The request object
 * @param params - The parameters object
 * @returns The location progress and status
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ lid: string }> }) {

    const { lid } = await params;
    try {
        const decodedId = decodeId(lid);
        const location = await db.query.locations.findFirst({
            where: (location, { eq }) => eq(location.id, decodedId),

        })

        return NextResponse.json(location, { status: 200 })

    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

