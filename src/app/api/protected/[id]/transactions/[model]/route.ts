
import { NextResponse } from 'next/server';
import { auth } from "@/auth";

export async function POST(req: Request, props: { params: Promise<{ id: string, model: string }> }) {
	const params = await props.params;
	const data = await req.json()
	const session = await auth();
	try {
		if (session) {
			const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/transactions/${params.model}`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${session.user.token}`,
					"locationId": `${params.id}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(data)
			})
			console.log(res)
			if (!res.ok) {
				return NextResponse.json({ message: "An error occurred saving program." }, { status: 400 });
			}
			const response = await res.json();
			return NextResponse.json(response, { status: 200 });
		}
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}