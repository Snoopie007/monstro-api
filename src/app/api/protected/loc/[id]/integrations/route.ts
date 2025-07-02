
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;

  try {
    const interations = await db.query.integrations.findMany({
      where: (interations, { eq }) => eq(interations.locationId, params.id),
    });

    return NextResponse.json(interations, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 })
  }
}


