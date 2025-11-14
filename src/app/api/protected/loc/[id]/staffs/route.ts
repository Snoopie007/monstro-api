import { db } from "@/db/db";
import {
	users,
	staffs,
	staffLocations,
	staffsLocationRoles,
} from "@/db/schemas";
import { and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { sendEmailViaApi } from "@/libs/server/emails";
import { hasPermission } from "@/libs/server/permissions";

type StaffProps = {
	id: string;
};

export async function GET(
	_req: Request,
	props: { params: Promise<StaffProps> }
) {
	const params = await props.params;


	try {
		const staffs = await db.query.staffLocations.findMany({
			where: (staffLocations, { eq }) =>
				and(eq(staffLocations.locationId, params.id)),
			with: {
				staff: true,
				roles: {
					with: {
						role: true,
					},
				},
			},
		});
		return NextResponse.json(staffs, { status: 200 });
	} catch (err) {
		return NextResponse.json({ error: err }, { status: 500 });
	}
}

export async function POST(
	req: Request,
	props: { params: Promise<StaffProps> }
) {
	const params = await props.params;
	const data = await req.json();

	// Check if user has permission to create staff
	const hasAuth = await hasPermission("add member", params.id);
	if (!hasAuth) {
		return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
	}

	// Validate role exists
	const role = await db.query.roles.findFirst({
		where: (roles, { eq }) => eq(roles.id, data.role), // Changed from data.roleId to data.role
	});

	if (!role) {
		return NextResponse.json({ error: "Role not found" }, { status: 404 });
	}

	const existingUser = await db.query.users.findFirst({
		where: (users, { eq }) => eq(users.email, data.email),
	});

	const staffName = `${data.firstName} ${data.lastName}`.trim(); // Combine firstName and lastName

	if (existingUser) {
		// Check if staff record already exists for this user
		const existingStaff = await db.query.staffs.findFirst({
			where: (staffs, { eq }) => eq(staffs.userId, existingUser.id),
		});

		if (!existingStaff) {
			// Create staff record for existing user
			const [newStaff] = await db
				.insert(staffs)
				.values({
					firstName: data.firstName,
					lastName: data.lastName,
					email: data.email,
					phone: data.phone,
					userId: existingUser.id,
				})
				.returning();

			// Create staff-location relationship
			const [staffLocation] = await db
				.insert(staffLocations)
				.values({
					staffId: newStaff.id,
					locationId: params.id,
				})
				.returning();

			// Assign role to staff-location
			await db.insert(staffsLocationRoles).values({
				staffLocationId: staffLocation.id,
				roleId: data.role,
			});
		} else {
			// Check if staff-location relationship exists
			const existingStaffLocation = await db.query.staffLocations.findFirst({
				where: (staffLocations, { and, eq }) =>
					and(
						eq(staffLocations.staffId, existingStaff.id),
						eq(staffLocations.locationId, params.id)
					),
			});

			if (!existingStaffLocation) {
				// Create staff-location relationship
				const [staffLocation] = await db
					.insert(staffLocations)
					.values({
						staffId: existingStaff.id,
						locationId: params.id,
					})
					.returning();

				// Assign role to staff-location
				await db.insert(staffsLocationRoles).values({
					staffLocationId: staffLocation.id,
					roleId: data.role,
				});
			} else {
				// Update role if staff-location exists
				await db
					.insert(staffsLocationRoles)
					.values({
						staffLocationId: existingStaffLocation.id,
						roleId: data.role,
					})
					.onConflictDoNothing(); // In case role already assigned
			}
		}

		try {
			await sendEmailViaApi({
				recipient: existingUser.email,
				template: "MemberInvite",
				subject: "Welcome to Monstro",
				data: {
					ui: { button: "Join the team." },
					location: { name: staffName },
					member: { name: staffName },
				}
			});
			return NextResponse.json({ success: true }, { status: 200 });
		} catch (emailError) {
			console.error(
				`Failed to send email to ${existingUser.email}:`,
				emailError
			);
			return NextResponse.json({ error: emailError }, { status: 500 });
		}
	} else {
		// Create new user
		const [newUser] = await db
			.insert(users)
			.values({
				email: data.email,
				name: staffName, // Use combined name for user table
				created: new Date(),
				// Removed password as it's optional and not provided in request
			})
			.returning();

		// Create staff record
		const [newStaff] = await db
			.insert(staffs)
			.values({
				firstName: data.firstName,
				lastName: data.lastName,
				email: data.email,
				phone: data.phone,
				userId: newUser.id,
			})
			.returning();

		// Create staff-location relationship
		const [staffLocation] = await db
			.insert(staffLocations)
			.values({
				staffId: newStaff.id,
				locationId: params.id,
			})
			.returning();

		// Assign role to staff-location
		await db.insert(staffsLocationRoles).values({
			staffLocationId: staffLocation.id,
			roleId: data.role,
		});

		try {
			await sendEmailViaApi({
				recipient: data.email,
				template: "MemberInvite",
				subject: "Welcome to Monstro",
				data: {
					ui: { button: "Join the team." },
					location: { name: staffName },
					member: { name: staffName },
				}
			});

			return NextResponse.json({ success: true }, { status: 200 });
		} catch (emailError) {
			console.error(`Failed to send email to ${data.email}:`, emailError);
			return NextResponse.json({ error: emailError }, { status: 500 });
		}
	}
}
