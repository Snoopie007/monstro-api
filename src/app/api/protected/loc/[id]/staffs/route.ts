import { db } from "@/db/db";
import {
	users,
	staffs,
	staffsLocations,
	userRoles,
	locations,
} from "@subtrees/schemas";
import { and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { sendEmailViaApi } from "@/libs/server/emails";
import { hasPermission } from "@/libs/server/permissions";
import { generateUsername, generateDiscriminator } from "../members/utils";

type StaffProps = {
	id: string;
};

export async function GET(
	_req: Request,
	props: { params: Promise<StaffProps> }
) {
	const params = await props.params;


	try {
		const staffs = await db.query.staffsLocations.findMany({
			where: (staffLocations, { eq }) =>
				and(eq(staffLocations.locationId, params.id)),
			with: {
				staff: {
					with: {
						user: {
							columns: {
								image: true,
							},
						},
					},
				},
			},
		});

		const userIds = staffs
			.map((sl) => sl.staff?.userId)
			.filter((id): id is string => Boolean(id));
		const userRolesByUserId = new Map<string, Array<{ id: string; name: string; color: any }>>();
		if (userIds.length > 0) {
			const rolesForUsers = await db.query.userRoles.findMany({
				where: (ur, { inArray }) => inArray(ur.userId, userIds),
				with: { role: true },
			});
			for (const ur of rolesForUsers) {
				if (!ur.userId || !ur.role) continue;
				const current = userRolesByUserId.get(ur.userId) ?? [];
				current.push(ur.role);
				userRolesByUserId.set(ur.userId, current);
			}
		}

		return NextResponse.json(
			staffs.map((sl) => ({
				...sl,
				roles: sl.staff?.userId ? userRolesByUserId.get(sl.staff.userId) ?? [] : [],
			})),
			{ status: 200 }
		);
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

	// Fetch location data
	const location = await db.query.locations.findFirst({
		where: (locations, { eq }) => eq(locations.id, params.id),
	});

	if (!location) {
		return NextResponse.json({ error: "Location not found" }, { status: 404 });
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
		let staffId: number;
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
			
			staffId = newStaff.id;

			// Create staff-location relationship
			const [staffLocation] = await db
				.insert(staffsLocations)
				.values({
					staffId: newStaff.id,
					locationId: params.id,
				})
				.returning();

			// Assign role to user
			await db.insert(userRoles).values({
				userId: existingUser.id,
				roleId: data.role,
			});
		} else {
			staffId = existingStaff.id;
			
			// Check if staff-location relationship exists
			const existingStaffLocation = await db.query.staffsLocations.findFirst({
				where: (staffLocations, { and, eq }) =>
					and(
						eq(staffLocations.staffId, existingStaff.id),
						eq(staffLocations.locationId, params.id)
					),
			});

			if (!existingStaffLocation) {
				// Create staff-location relationship
				const [staffLocation] = await db
					.insert(staffsLocations)
					.values({
						staffId: existingStaff.id,
						locationId: params.id,
					})
					.returning();

				// Assign role to user
				await db.insert(userRoles).values({
					userId: existingUser.id,
					roleId: data.role,
				});
			} else {
				// Ensure user role exists
				await db
					.insert(userRoles)
					.values({
						userId: existingUser.id,
						roleId: data.role,
					})
					.onConflictDoNothing(); // In case role already assigned
			}
		}

		try {
			await sendEmailViaApi({
				recipient: existingUser.email,
				template: "MemberInviteEmail",
				subject: "Welcome to Monstro",
				data: {
					location: {
						name: location.name,
						id: params.id,
					},
					member: {
						firstName: data.firstName,
						id: staffId,
					},
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
				username: generateUsername(staffName),
				discriminator: generateDiscriminator(),
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
			.insert(staffsLocations)
			.values({
				staffId: newStaff.id,
				locationId: params.id,
			})
			.returning();

		// Assign role to user
		await db.insert(userRoles).values({
			userId: newUser.id,
			roleId: data.role,
		});

		try {
			await sendEmailViaApi({
				recipient: data.email,
				template: "MemberInviteEmail",
				subject: "Welcome to Monstro",
				data: {
					location: {
						name: location.name,
						id: params.id,
					},
					member: {
						firstName: data.firstName,
						id: newStaff.id,
					},
				}
			});

			return NextResponse.json({ success: true }, { status: 200 });
		} catch (emailError) {
			console.error(`Failed to send email to ${data.email}:`, emailError);
			return NextResponse.json({ error: emailError }, { status: 500 });
		}
	}
}
