
import { NextResponse } from 'next/server';
import { auth } from "@/auth";


export async function GET(request: Request, props: { params: Promise<{ programId: string }> }) {
    const params = await props.params;
    const session = await auth();
    try {
		if (session) {

			const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/member/fetch-vendor-stripe-pk/${params.programId}`, {
				headers: {
					'Authorization': `Bearer ${session.user.token}`,
				}
			});
			if (!res.ok) {
				return NextResponse.json({ message: "An error occurred while fetching the data." }, { status: 400 });
			}
			const { data } = await res.json();
			return NextResponse.json(data, { status: 200 });
		}
	} catch (err) {
		return NextResponse.json({ error: err }, { status: 500 })
	}
}