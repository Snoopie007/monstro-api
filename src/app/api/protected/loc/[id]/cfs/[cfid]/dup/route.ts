import { db } from "@/db/db";
import { memberFields } from "@/db/schemas";
import { NextRequest, NextResponse } from "next/server";


type Props = {
    params: Promise<{ id: string; cfid: string }>;
}


export async function POST(req: NextRequest, props: Props) {
    const { id, cfid } = await props.params;



    try {
        const existing = await db.query.memberFields.findFirst({
            where: (field, { eq }) => eq(field.id, cfid),
        });
        if (!existing) {
            return NextResponse.json({ error: "Custom field not found" }, { status: 404 });
        }

        // Remove the id from the existing field
        const { id, ...rest } = existing;

        const [newField] = await db.insert(memberFields).values({
            ...rest,
            name: `${existing.name} (Copy)`,
        }).returning();
        return NextResponse.json(newField, { status: 200 });
    } catch (error) {
        console.error("Error duplicating custom field:", error);
        return NextResponse.json({ error: "Failed to duplicate custom field" }, { status: 500 });
    }
}
