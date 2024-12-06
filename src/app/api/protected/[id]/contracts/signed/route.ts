import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';

export async function GET(req: Request, props: { params: Promise<{ id: number }> }) {
  const params = await props.params;
  const session = await auth();
  try {
    if (session) {
      const contracts = await db.query.contracts.findMany({
        where: (contracts, { eq }) => eq(contracts.locationId, params.id),
        with: {
          member: true,
          plan: {
            with: {
              program: true
            }
          },
        }
      });
      // const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/contracts/signed`, {
      //   headers: {
      //     'Authorization': `Bearer ${session.user.token}`,
      //     "locationId": `${params.id}`,
      //   }
      // });

      // if (!res.ok) {
      //   return NextResponse.json({ message: "An error occurred while fetching the data." }, { status: 400 });
      // }

      // const { data } = await res.json();
      return NextResponse.json(contracts, { status: 200 });
    }
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 })
  }
}