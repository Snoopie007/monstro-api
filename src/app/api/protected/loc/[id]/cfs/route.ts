import { db } from "@/db/db";
import { memberFields } from "@/db/schemas";
import { NextRequest, NextResponse } from "next/server";


type Props = {
	params: Promise<{ id: string; }>;
}


export async function GET(req: NextRequest, props: Props) {
	const { id } = await props.params;

	try {
		const customFields = await db.query.memberFields.findMany({
			where: (field, { eq }) => eq(field.locationId, id),
			orderBy: (field, { asc }) => [asc(field.created)],
		});

		return NextResponse.json({ success: true, data: customFields }, { status: 200 });
	} catch (error) {
		console.error("Error fetching custom fields:", error);
		return NextResponse.json({ success: false, error: "Failed to fetch custom fields" }, { status: 500 });
	}
}

export async function POST(req: NextRequest, props: Props) {
	const { id } = await props.params;
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
