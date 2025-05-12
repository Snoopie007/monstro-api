import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { authenticateMember } from '@/libs/utils';
import { and, eq } from 'drizzle-orm';
import { programs, programSessions, staffs, planPrograms, memberPlans } from '@/db/schemas';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ pid: number, lid: number }> }
) {
  try {
    const params = await props.params;
    const authMember = authenticateMember(req);

    const memberExists = await db.query.members.findFirst({
      where: (members, { eq }) => eq(members.id, Number(authMember.member?.id)),
      columns: { id: true }
    });

    if (!memberExists) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const program = await db.query.programs.findFirst({
      where: (program, { and, eq }) =>
        and(
          eq(program.locationId, Number(params.lid)),
          eq(program.id, params.pid)
        ),
      with: {
        instructor: true,
        sessions: {
          where: (session) => eq(session.programId, params.pid)
        },
        planPrograms: {
          with: {
            plan: true
          }
        }
      }
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    const transformedProgram = {
      ...program,
      plans: program.planPrograms.map(pp => pp.plan)
    };

    return NextResponse.json(transformedProgram, { status: 200 });

  } catch (err) {
    console.error('Error fetching program:', err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}