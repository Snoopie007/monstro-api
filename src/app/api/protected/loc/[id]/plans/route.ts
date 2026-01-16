import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	try {
		const mbs = await db.query.memberPlans.findMany({
			where: (memberPlans, { eq }) => eq(memberPlans.locationId, id),
			with: {
				planPrograms: {
					with: {
						program: true,
					},
				},
				pricingOptions: true,
			},
		});

		return NextResponse.json(mbs, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}
