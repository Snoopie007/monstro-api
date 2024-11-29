
import { NextResponse } from 'next/server';
import { auth } from "@/auth";

export async function POST(req: Request) {
  const session = await auth();
  const data = await req.json()
  try {
    if (session) {

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/member/fill-contract`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.user.token}`,
			    "content-type": "application/json"
        },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        return NextResponse.json({ message: "An error occurred while fetching the data." }, { status: 400 });
      }
      const response = await res.json();
      return NextResponse.json({ message: "success", data: response.data }, { status: 200 });
    }
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}