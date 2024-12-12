import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  const data = await req.json()
  try {

    if (session) {


      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/add-program-level`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.user.token}`,
          "locationId": `${params.id}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      console.log(res);
      if (!res.ok) {
        return NextResponse.json({ message: "An error occurred saving program level." }, { status: 400 });
      }

      return NextResponse.json({ message: "Success" }, { status: 200 });
    }
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}

