
import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';

export async function GET(req: Request, props: { params: Promise<{ id: number }> }) {
  const params = await props.params;
  const session = await auth();
  try {
    if (session) {
      const interations = await db.query.integrations.findMany({
        where: (interations, { eq }) => eq(interations.locationId, params.id),
      });

      return NextResponse.json(interations, { status: 200 });
    }
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 })
  }
}