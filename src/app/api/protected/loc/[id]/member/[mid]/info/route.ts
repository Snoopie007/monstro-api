// MEMBER INFO UPDATE START: New API route for member personal info updates
import { db } from "@/db/db";
import { memberLocations } from "@/db/schemas";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { MemberLocationProfile } from "@/types/member";

export async function POST(
	req: Request,
	props: { params: Promise<{ id: string; mid: string }> }
) {
	const params = await props.params;
	const data = await req.json();

	try {
		const session = await auth();
		if (!session?.user?.vendorId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Verify that the member belongs to a location owned by this vendor
		const memberLocation = await db.query.memberLocations.findFirst({
			where: (memberLocation, { eq, and }) =>
				and(
					eq(memberLocation.locationId, params.id),
					eq(memberLocation.memberId, params.mid)
				),
			with: {
				location: {
					columns: {
						vendorId: true,
					},
				},
			},
		});

		if (
			!memberLocation ||
			memberLocation.location?.vendorId !== session.user.vendorId
		) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const locationProfile: MemberLocationProfile = {
			firstName: data.firstName,
			lastName: data.lastName,
			email: data.email,
			phone: data.phone,
			avatar: data.avatar,
		}

		const [updatedMemberLocation] = await db
			.update(memberLocations)
			.set({
				profile: locationProfile,
				updated: new Date(),
			})
			.where(
				and(
					eq(memberLocations.locationId, params.id),
					eq(memberLocations.memberId, params.mid)
				)
			)
			.returning();

		if (!updatedMemberLocation) {
			return NextResponse.json(
				{ error: "Member location not found" },
				{ status: 404 }
			);
		}


		return NextResponse.json({ success: true, ...data }, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}

export async function GET(
	req: Request,
	props: { params: Promise<{ id: string; mid: string }> }
) {
	const params = await props.params;

	try {
		const session = await auth();
		if (!session?.user?.vendorId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Verify that the member belongs to a location owned by this vendor
		const memberLocationCheck = await db.query.memberLocations.findFirst({
			where: (memberLocation, { eq, and }) =>
				and(
					eq(memberLocation.locationId, params.id),
					eq(memberLocation.memberId, params.mid)
				),
			with: {
				location: {
					columns: {
						vendorId: true,
					},
				},
			},
		});

		if (
			!memberLocationCheck ||
			memberLocationCheck.location?.vendorId !== session.user.vendorId
		) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		// Fetch memberLocation with member info
		const memberLocation = await db.query.memberLocations.findFirst({
			where: (memberLocation, { eq, and }) =>
				and(
					eq(memberLocation.locationId, params.id),
					eq(memberLocation.memberId, params.mid)
				),
			with: {
				member: true, // Include base member data for fallback
			},
		});

		if (!memberLocation) {
			return NextResponse.json(
				{ error: "Member location not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json(memberLocation, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}
// MEMBER INFO UPDATE END
