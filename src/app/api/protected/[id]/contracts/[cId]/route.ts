import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';

export async function GET(req: Request, props: { params: Promise<{ cid: number, id: string }> }) {
  const params = await props.params;
  const session = await auth();

  try {
    if (session) {
      const template = await db.query.contractsTemplates.findFirst({
        where: (templates, { eq }) => eq(templates.id, params.cid),
      })

      return NextResponse.json(template, { status: 200 });
    }
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 })
  }
}

export async function POST(req: Request, props: { params: Promise<{ cid: string, id: string }> }) {
  const params = await props.params;
  const session = await auth();
  const d = await req.json()
  try {
    if (session) {

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/contracts/${params.cid}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.user.token}`,
          "locationId": `${params.id}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(d)
      })
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

export async function DELETE(req: Request, props: { params: Promise<{ cid: string, id: string }> }) {
  const params = await props.params;
  const session = await auth();
  try {
    if (session) {

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/contracts/${params.cid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.user.token}`,
          "locationId": `${params.id}`,
          'Content-Type': 'application/json'
        }
      })
      if (!res.ok) {
        return NextResponse.json({ message: "An error occurred deleting contract." }, { status: 400 });
      }
      const response = await res.json();
      return NextResponse.json(response, { status: 200 });
    }
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}