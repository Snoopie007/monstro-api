import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';
import { and, count, eq, ilike, or, sql } from 'drizzle-orm';
import { memberLocations, members, } from '@/db/schemas';

export async function GET(req: Request, props: { params: Promise<{ id: number }> }) {
	const params = await props.params;
	console.log("Get Members");
	const { searchParams } = new URL(req.url);

	const pageSize = parseInt(searchParams.get("size") || "10");
	const page = parseInt(searchParams.get("page") || "1");
	const query = searchParams.get("query") || ""; // Search string

	try {
			const session = await auth();

			if (session) {
					// Base condition: Filter by locationId from memberLocations
					const baseCondition = eq(memberLocations.locationId, params.id);

					// Optional search condition for members (case-insensitive match)
					const searchCondition = query
							? or(
										ilike(members.firstName, `%${query}%`), // Match firstName
										ilike(members.lastName, `%${query}%`) // Match lastName
								)
							: undefined;

					// Fetch members with search and base conditions
					const membersResult = await db
							.select({
									id: members.id,
									firstName: members.firstName,
									lastName: members.lastName,
									email: members.email,
									phone: members.phone,
									avatar: members.avatar,
							})
							.from(memberLocations)
							.innerJoin(members, eq(memberLocations.memberId, members.id)) // Join with members table
							.where(searchCondition ? and(baseCondition, searchCondition) : baseCondition) // Combine conditions
							.limit(pageSize)
							.offset((page - 1) * pageSize);

					// Fetch the total count (with the same conditions)
					const totalCountResult = await db
							.select({ count: sql<number>`count(*)` })
							.from(memberLocations)
							.innerJoin(members, eq(memberLocations.memberId, members.id))
							.where(searchCondition ? and(baseCondition, searchCondition) : baseCondition);

					const totalCount = totalCountResult[0]?.count || 0;

					// Return the paginated result and total count
					return NextResponse.json(
							{
									count: totalCount,
									members: membersResult,
							},
							{ status: 200 }
					);
			}
	} catch (err) {
			console.error(err);
			return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
	const params = await props.params;
	const session = await auth();
	const data = await req.json()
	console.log(data)
	try {

		if (session) {

			const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/add-member`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${session.user.token}`,
					"locationId": `${params.id}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(data)
			});
			console.log(res);
			
			if (!res.ok) {
				return NextResponse.json({ message: "An error occurred saving member." }, { status: 400 });
			}

			return NextResponse.json({ message: "Success" }, { status: 200 });
		}
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}