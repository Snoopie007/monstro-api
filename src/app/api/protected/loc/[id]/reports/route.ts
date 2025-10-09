import { db } from "@/db/db";
import { NextResponse, NextRequest } from "next/server";
import { and, eq, gte, lte, SQL } from "drizzle-orm";
import {
	transactions,
	memberLocations,
} from "@/db/schemas";

type ReportProps = {
	params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, props: ReportProps) {
	const { id } = await props.params;
	const { searchParams } = new URL(req.url);

	// Extract date parameters
	const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : new Date(new Date().getFullYear(), 0, 1);
	const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : new Date(new Date().getFullYear(), 11, 31);



	try {


		const transactions = await db.query.transactions.findMany({
			where: (t, { and, eq, gte, lte }) =>
				and(
					eq(t.locationId, id),
					eq(t.status, "paid"),
					gte(t.created, startDate),
					lte(t.created, endDate),
				),
		});



		const mls = await db.query.memberLocations.findMany({
			where: (ml, { and, eq, gte, lte }) =>
				and(
					eq(ml.locationId, id),
				),
			with: {
				member: true,
			},
		});

		// const t = transactions.map((transaction) => ({
		// 	...transaction,
		// 	items: transaction.items as unknown as Record<string, unknown>[],
		// }));

		return NextResponse.json({ transactions, mls }, { status: 200 });
	} catch (err) {
		console.error("Error fetching reports:", err);
		return NextResponse.json(
			{ error: "Failed to fetch reports" },
			{ status: 500 }
		);
	}
}
