
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { and, eq } from 'drizzle-orm';
import { authenticateMember } from '../../utils';


export async function GET(req: NextRequest, props: { params: Promise<{ id: number }> }) {
  const params = await props.params;
  try {

    const authMember = authenticateMember(req);
    const memberId = authMember.member?.id;
    const member = await db.query.members.findFirst({
      where: (members, { eq }) => eq(members.id, Number(memberId)),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const achievements = await db.query.achievements.findMany({
      where: (achievements, { eq, }) => 
        eq(achievements.locationId, Number(params.id)),
      with: {
       
      },
  });
  

    return NextResponse.json({ status: 200 });
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}