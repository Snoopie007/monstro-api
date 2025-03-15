import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { } from '@/db/schemas/programs'

export async function GET(req: Request, props: { params: Promise<{ progid: number, id: string }> }
) {
  const { progid } = await props.params;

  if (!progid) {
    return NextResponse.json({ error: 'Program ID is required' }, { status: 400 });
  }

  const program = await db.query.programs.findMany({
    where: (program, { eq }) => eq(program.id, progid),
  });

  console.log(program);

  if (!program) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 });
  }

  return NextResponse.json(program, { status: 200 });

}