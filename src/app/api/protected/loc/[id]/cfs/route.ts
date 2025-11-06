import { db } from "@/db/db";
import { memberFields } from "@/db/schemas";
import { NextRequest, NextResponse } from "next/server";


type Props = {
	params: Promise<{ id: string; cfid: string }>;
}


export async function POST(req: NextRequest, props: Props) {
	const { id, cfid } = await props.params;
	const body = await req.json();

	if (body.type === "select" || body.type === "multi-select") {
		if (body.options.length === 0) {
			return NextResponse.json({ error: "Select and Multi-Select fields must have at least one option" }, { status: 400 });
		}
	}


	try {

		const [field] = await db.insert(memberFields).values({
			...body,
			locationId: id,
		}).returning();
		return NextResponse.json(field, { status: 200 });
	} catch (error) {
		console.error("Error creating custom field:", error);
		return NextResponse.json({ error: "Failed to create custom field" }, { status: 500 });
	}
}
