import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import { admindb } from "@/db/db";
import { supportCaseMessages } from "@/db/admin";



export async function POST(req: NextRequest) {
    const { locationId, ...rest } = await req.json();
    const session = await auth();
    if (!session || !session.user.vendorId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const msg = await admindb.insert(supportCaseMessages).values({
            caseId: rest.caseId,
            agentId: null,
            content: rest.content,
            role: "user",
            type: "message"
        })
        return NextResponse.json(msg, { status: 200 });
    } catch (err) {
        console.log(err);
        return NextResponse.json({ error: err }, { status: 500 });
    }
}