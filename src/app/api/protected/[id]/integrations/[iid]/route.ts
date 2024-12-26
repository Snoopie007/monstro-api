
import { NextResponse } from 'next/server';
import { auth } from "@/auth";


export async function DELETE(req: Request, props: { params: Promise<{ iid: string, id: string }> }) {
  const params = await props.params;
  const session = await auth();
  try {
    if (session) {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/integrations/${params.iid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.user.token}`,
          "locationId": `${params.id}`
        }
      });
      return NextResponse.json({ message: 'Success' }, { status: 200 });
    }
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}