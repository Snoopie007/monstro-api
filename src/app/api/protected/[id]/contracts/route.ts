import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';
import { and, isNull } from 'drizzle-orm';

export async function GET(req: Request, props: { params: Promise<{ id: number }> }) {
  const params = await props.params;
  const session = await auth();
  try {
    if (session) {
      const templates = await db.query.contractsTemplates.findMany({
        where: (contractsTemplates, { eq }) => (and(eq(contractsTemplates.locationId, params.id), eq(contractsTemplates.deleted, isNull(contractsTemplates.deleted)))),
        with: {
          plans: true
        }
      });
      // const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/contracts`, {
      //   headers: {
      //     'Authorization': `Bearer ${session.user.token}`,
      //     "locationId": `${params.id}`
      //   }
      // });

      // if (!res.ok) {
      //   return NextResponse.json({ message: "An error occurred while fetching the data." }, { status: 400 });
      // }

      // const { data } = await res.json();
      return NextResponse.json(templates, { status: 200 });
    }
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 })
  }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  const data = await req.json()
  try {
    if (session) {

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/create-contract`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.user.token}`,
          "locationId": `${params.id}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });


      if (!res.ok) {
        return NextResponse.json({ message: "An error occurred saving contract." }, { status: 400 });
      }
      const response = await res.json();
      return NextResponse.json(response, { status: 200 });
    }
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}