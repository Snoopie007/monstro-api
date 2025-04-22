
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { authenticateMember } from '@/libs/utils';

export async function GET(req: NextRequest,props: { params: Promise<{ pid: number, lid: number }> }) {
  try {
    const params = await props.params;

    const authMember = authenticateMember(req);

    const member = await db.query.members.findFirst({
      where: (members, { eq }) => eq(members.id, Number(authMember.member?.id)),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const programs = await db.query.programs.findFirst({
      where: (program, { eq, and }) =>
        and(eq(program.locationId, Number(params.lid)), eq(program.id, params.pid)) ,
      with: {
        instructor: true,
        sessions: true,
        plans: true
      }
    });

    return NextResponse.json(programs, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 })
  }
}