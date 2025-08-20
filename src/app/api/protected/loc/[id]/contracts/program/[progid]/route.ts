import { NextResponse } from 'next/server';
import { db } from '@/db/db';

type Params = {
  progid: string;
  id: string;
}

export async function GET(req: Request, props: { params: Promise<Params> }) {
  const { progid } = await props.params;


  if (!progid) {
    return NextResponse.json({ error: 'Program ID is required' }, { status: 400 });
  }

  const program = await db.query.programs.findMany({
    where: (program, { eq }) => eq(program.id, progid),
  });

  if (!program) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 });
  }

  return NextResponse.json(program, { status: 200 });

}