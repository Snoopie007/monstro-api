import { NextResponse } from 'next/server';
import { auth } from "@/auth";

export async function GET(req: Request, props: { params: Promise<{id: string, sId: number}> }) {
  const params = await props.params;
  const session = await auth();
  try {
    if (session) {

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/contracts/signed/${params.sId}`, {
        headers: {
          'Authorization': `Bearer ${session.user.token}`,
          "locationId": `${params.id}`,
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