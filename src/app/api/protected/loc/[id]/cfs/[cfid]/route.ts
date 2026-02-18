import { db } from "@/db/db";
import { memberFields } from "@subtrees/schemas";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";


type Props = {
    params: Promise<{ id: string; cfid: string }>;
}


export async function PATCH(req: Request, props: Props) {
    const { id, cfid } = await props.params;
    const body = await req.json();

    if (body.type === "select" || body.type === "multi-select") {
        if (body.options.length === 0) {
            return NextResponse.json({ error: "Select and Multi-Select fields must have at least one option" }, { status: 400 });
        }
    }


    try {
        await db.update(memberFields).set(body).where(eq(memberFields.id, cfid));
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Error updating custom field:", error);
        return NextResponse.json({ error: "Failed to update custom field" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, props: Props) {
    const { id, cfid } = await props.params;

    try {
        await db.delete(memberFields).where(eq(memberFields.id, cfid));
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Error deleting custom field:", error);
        return NextResponse.json({ error: "Failed to delete custom field" }, { status: 500 });
    }
}