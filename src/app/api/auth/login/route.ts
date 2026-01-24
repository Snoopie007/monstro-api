import { db } from "@/db/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
	const { email, password, lid } = await req.json();
	const normalizedEmail = email.toLowerCase();
	try {

		let user = null;
		user = await db.query.vendors.findFirst({
			where: (vendor, { eq }) => eq(vendor.email, normalizedEmail),
			with: {
				user: {
					with: {
						accounts: true
					}
				},
			},
		});

		if (!user) {
			user = await db.query.staffs.findFirst({
				where: (staff, { eq }) => eq(staff.email, normalizedEmail),
				with: {
					user: {
						with: {
							accounts: true
						}
					},
				},
			});
		}

		const foundPassword = user?.user.accounts?.[0]?.password;

		if ((!user || !user.user || !foundPassword)) {
			return NextResponse.json({ error: "User not found" }, { status: 401 });
		}

		const match = await bcrypt.compare(password, foundPassword);

		if (!match) {
			return NextResponse.json({ error: "Invalid password" }, { status: 401 });
		}

		let location = null;

		if (lid) {
			location = await db.query.locations.findFirst({
				where: (locations, { eq, and }) =>
					and(eq(locations.vendorId, user.id), eq(locations.id, lid)),
				columns: {
					id: true,
				},
				with: {
					locationState: {
						columns: {
							status: true,
						},
					},
				},
			});
		}

		const LoginUser = {
			...user,
			id: user.user.id,
			name: `${user.firstName} ${user.lastName}`,
		};

		return NextResponse.json(
			{
				user: LoginUser,
			},
			{ status: 200 }
		);
	} catch (error) {
		console.log(error);
		return NextResponse.json({ error }, { status: 500 });
	}
}
