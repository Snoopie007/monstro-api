import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';
import { eq, sql } from 'drizzle-orm';
import { memberLocations, } from '@/db/schemas';

export async function GET(req: Request, props: { params: Promise<{ id: number }> }) {
	const params = await props.params;
	console.log("Get Members")
	const { searchParams } = new URL(req.url);
	const pageSize = parseInt(searchParams.get('size') || "10");
	const page = parseInt(searchParams.get('page') || "1");

	try {
		const session = await auth();

		if (session) {
			const members = await db.query.memberLocations.findMany({
				limit: pageSize,
				offset: (page - 1) * pageSize,
				columns: {
					memberId: false,
					locationId: false
				},
				where: (memberLocations, { eq }) => eq(memberLocations.locationId, params.id),
				with: {
					member: true
				},
				extras: {
					counts: db.$count(memberLocations, eq(memberLocations.locationId, params.id)).as("counts"),
				}
			})


			// const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/get-members-by-location`, {
			// 	headers: {
			// 		'Authorization': `Bearer ${session.user.token}`,
			// 		"locationId": `${params.id}`
			// 	}
			// })

			// if (!res.ok) {
			// 	return NextResponse.json({ message: "An error occurred while fetching the data." }, { status: 400 });
			// }

			// const { data } = await res.json();
			const flattened = members.map(data => ({
				counts: data.counts,
				...data.member

			}));

			return NextResponse.json(flattened, { status: 200 });
		}
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
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