import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { and, eq, isNull } from "drizzle-orm";
import { authenticateMember } from "@/libs/utils";
import {
	reservations,
	recurringReservations,
	reservationExceptions,
} from "@subtrees/schemas";
import { cancelClassReminders } from "../../../utils";

export async function DELETE(
	req: NextRequest,
	props: { params: Promise<{ id: string; mid: string; rid: string }> }
) {
	const params = await props.params;

	try {
		const reservation = await db.query.reservations.findFirst({
			where: (r, { eq, and }) =>
				and(
					eq(r.id, params.rid),
					eq(r.memberId, params.mid),
					eq(r.locationId, params.id)
				),
			with: {
				session: {
					with: {
						program: true,
					},
				},
				memberSubscription: true,
			},
		});

		if (!reservation) {
			return NextResponse.json(
				{ error: "Reservation not found or not authorized" },
				{ status: 404 }
			);
		}

		const currentDate = new Date();
		const reservationDate = new Date(reservation.startOn);

		if (reservationDate < currentDate) {
			return NextResponse.json(
				{ error: "Cannot cancel past reservations" },
				{ status: 400 }
			);
		}

		if (reservation.session?.program?.allowWaitlist) {
			console.log(
				`Waitlist notification needed for session ${reservation.sessionId}`
			);
		}

	await db.delete(reservations).where(eq(reservations.id, params.rid));

	// Cancel scheduled reminder emails
	try {
		await cancelClassReminders({
			reservationId: params.rid,
			locationId: params.id,
		});
		console.log(`📧 Cancelled class reminders for reservation ${params.rid}`);
	} catch (error) {
		console.error('Error cancelling class reminders:', error);
		// Don't fail the cancellation if email cancellation fails
	}

		return NextResponse.json(
			{
				message: "Reservation cancelled successfully",
			},
			{ status: 200 }
		);
	} catch (err) {
		console.error(err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
