
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { authenticateMember } from '@/libs/utils';
import { achievements } from '@/db/schemas';
import { ExtendedAttendance } from '@/types';


export async function GET(req: NextRequest, props: { params: Promise<{ lid: number }> }) {
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

    // const [subs, pkgs] = await Promise.all([
    //   db.query.memberSubscriptions.findMany({
    //     where: (memberSubscriptions, { eq, and }) => and(
    //       eq(memberSubscriptions.memberId, Number(memberId)),
    //       eq(memberSubscriptions.locationId, params.lid)
    //     ),
    //     with: {
    //       program: {
    //         columns: {
    //           name: true
    //         }
    //       },
    //       reservations: {
    //         with: {
    //           attendances: true
    //         }
    //       }
    //     }
    //   }),
    //   db.query.memberPackages.findMany({
    //     where: (memberPackages, { eq, and }) => and(
    //       eq(memberPackages.memberId, Number(memberId)),
    //       eq(memberPackages.locationId, params.lid)
    //     ),
    //     with: {
    //       program: {
    //         columns: {
    //           name: true
    //         }
    //       },
    //       reservations: {
    //         with: {
    //           attendances: true
    //         }
    //       }
    //     }
    //   })
    // ]);

    // const attendances: ExtendedAttendance[] = [];
    // const memberPlans = [...(subs || []), ...(pkgs || [])];

    // memberPlans.forEach(plan => {
    //   if (!plan.reservations?.length) return;

    //   const programName = plan.program.name;

    //   plan.reservations.forEach(reservation => {
    //     if (!reservation.attendances?.length) return;

    //     reservation.attendances.forEach(attendance => {
    //       attendances.push({
    //         ...attendance,
    //         programName,
    //         created: attendance.created ?? new Date()
    //       });
    //     });
    //   });
    // });


    return NextResponse.json([], { status: 200 });
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}