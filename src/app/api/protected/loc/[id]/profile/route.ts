import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  console.log(session?.user)
  const data = await req.json()
  try {

    if (session) {

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/update-profile/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.user.token}`,
          "locationId": `${params.id}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        return NextResponse.json({ message: "An error occurred saving role." }, { status: 400 });
      }

      return NextResponse.json({ message: 'Success' }, { status: 200 });
    }
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}