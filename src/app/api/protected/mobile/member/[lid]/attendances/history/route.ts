
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { authenticateMember } from '@/libs/utils';
import { ExtendedAttendance } from '@/types';


export async function GET(req: NextRequest, props: { params: Promise<{ lid: number }> }) {
	const params = await props.params;
	try {

		const authMember = authenticateMember(req);
		const memberId = authMember.member?.id;
		const member = await db.query.members.findFirst({
			where: (members, { eq }) => eq(members.id, Number(memberId)),
			with: {
				subscriptions: true,
				packages: true
			}
		});

		if (!member) {
			return NextResponse.json({ error: "Member not found" }, { status: 404 });
		}

		const subIds = member.subscriptions.map(sub => sub.id);
		const pkgIds = member.packages.map(pkg => pkg.id);
		const reservations = await db.query.reservations.findMany({
			where: (reservations, { inArray, or, and, eq }) => and(
				or(
					inArray(reservations.memberSubscriptionId, subIds),
					inArray(reservations.memberPackageId, pkgIds)
				),
				eq(reservations.status, "active"),
				eq(reservations.locationId, params.lid)
			),
			with: {
				session: {
					with: {
						program: true
					}
				},
				attendances: true,
			}
		})

		const attendances: ExtendedAttendance[] = [];


		reservations.forEach(reservation => {
			if (!reservation.attendances?.length) return;

			const programName = reservation.session?.program?.name ?? "Unknown";

			reservation.attendances.forEach(attendance => {
				attendances.push({
					...attendance,
					programName,
					created: attendance.created ?? new Date()
				});
			});
		});


		return NextResponse.json(attendances, { status: 200 });
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}