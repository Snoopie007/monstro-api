import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import { admindb } from "@/db/db";
import { supportCaseMessages } from "@/db/admin";



export async function POST(req: NextRequest) {
    const data = await req.json();
    const session = await auth();
    if (!session || !session.user.vendorId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const [msg] = await admindb.insert(supportCaseMessages).values({
            caseId: data.caseId,
            agentId: null,
            content: data.content,
            role: "user",
            type: "message"
        }).returning();
        return NextResponse.json(msg, { status: 200 });
    } catch (err) {
        console.log(err);
        return NextResponse.json({ error: err }, { status: 500 });
    }
}