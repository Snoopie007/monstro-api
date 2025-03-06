import { NextResponse } from 'next/server';
import { db } from '@/db/db';

export async function GET(req: Request, props: { params: Promise<{ mid: number, id: number }> }) {
	const params = await props.params;
	try {
		const member = await db.query.members.findFirst({
			where: (members, { eq }) => eq(members.id, params.mid)
		});

		const family = await db.query.familyMembers.findMany({
			where: (familyMembers, { eq }) => eq(familyMembers.memberId, params.mid),
			with: {
				member: true
			}
		});

		return NextResponse.json(member, { status: 200 });
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