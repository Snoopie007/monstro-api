import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { and, eq, isNull } from "drizzle-orm";
import { authenticateMember } from "@/libs/utils";
import {
	reservations,
	recurringReservations,
	recurringReservationsExceptions,
} from "@/db/schemas";
import { serviceApiClient } from "@/libs/api/server";

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
			const apiClient = serviceApiClient();

			// Cancel both upcoming reminder and missed class emails
			await Promise.allSettled([
				apiClient.delete(`/protected/locations/email/class-reminder-${params.rid}`),
				apiClient.delete(`/protected/locations/email/missed-class-${params.rid}`)
			]);

			console.log(`📧 Cancelled reminder emails for reservation ${params.rid}`);
		} catch (error) {
			console.error('Error cancelling reminder emails:', error);
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
