import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';

export async function GET(req: Request, props: { params: Promise<{ mid: number, id: number }> }) {
    const params = await props.params;
    console.log("Get Member ", params.mid)
    try {
		const session = await auth();
		if (session) {
			const member = await db.query.members.findFirst({
				where: (members, { eq }) => eq(members.id, params.mid),

			});

			// const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/member-details/${params.mId}`, {
			//   headers: {
			//     'Authorization': `Bearer ${session.user.token}`,
			//     "locationId": `${params.id}`
			//   }
			// })

			// if (!res.ok) {
			//   return NextResponse.json({ message: "An error occurred while fetching the data." }, { status: 400 });
			// }
			// const { data } = await res.json();


			return NextResponse.json(member, { status: 200 });
		}
	} catch (err) {
		return NextResponse.json({ error: err }, { status: 500 })
	}
}

// export async function POST(req: NextApiRequest) {
//   try {
//     const a = await auth();
//     const data = await req.json()
//     console.log(data)
//     if(a) {
//       const res = await postWithToken({url: '/vendor/add-program', token: a.user.token, location: a.user.activeLocation.id, data: data  });
//       return NextResponse.json({ res }, { status: 200 });
//     }
//   } catch (err) {
//     console.log(err)
//     return NextResponse.json({ error: err }, { status: 500 })
//   }
// }