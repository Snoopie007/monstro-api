import { NextResponse } from 'next/server';
import { auth } from "@/auth";

export async function GET(request: Request, props: { params: Promise<{ rId: string, id: string }> }) {
  const params = await props.params;
  const session = await auth();
  try {
    if (session) {

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/rewards/${params.rId}`, {
        headers: {
          'Authorization': `Bearer ${session.user.token}`,
          "locationId": `${params.id}`
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

export async function POST(req: Request, props: { params: Promise<{ rId: string, id: string }> }) {
  const params = await props.params;
  const session = await auth();
  const data = await req.json()
  try {

    if (session) {

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/rewards/${params.rId}/update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.user.token}`,
          "locationId": `${params.id}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        return NextResponse.json({ message: "An error occurred saving reward." }, { status: 400 });
      }

      return NextResponse.json({ message: 'Success' }, { status: 200 });
    }
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ rId: string, id: string }> }) {
  const params = await props.params;
  const session = await auth();
  try {
    if (session) {

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/rewards/${params.rId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.user.token}`,
          "locationId": `${params.id}`
        }
      });

      if (!res.ok) {
        return NextResponse.json({ message: "An error occurred deleting reward." }, { status: 400 });
      }

      return NextResponse.json({ message: "Success" }, { status: 200 });
    }
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}