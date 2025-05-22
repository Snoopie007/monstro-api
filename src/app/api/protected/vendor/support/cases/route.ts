import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";
import { admindb } from "@/db/db";
import { supportCases, supportCaseMessages } from "@/db/admin";
import { decodeId } from "@/libs/server/sqids";
import { sql } from "drizzle-orm";
import { EmailSender } from "@/libs/server/emails";

export async function GET(req: NextRequest) {
	const session = await auth();
	if (!session || !session.user.vendorId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const cases = await admindb.query.supportCases.findMany({
			where: (supportCases, { eq }) => eq(supportCases.userId, session?.user.vendorId),
			with: {
				messages: true,
			},
			extras: {
				messagesCount: sql<number>`(
					SELECT COUNT(DISTINCT scm.id) 
					FROM ${supportCaseMessages} scm
					WHERE scm.case_id = ${supportCases.id}
				)`.as('messagesCount'),
			}
		});

		return NextResponse.json(cases, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}

export async function POST(req: NextRequest) {
	const { locationId, ...rest } = await req.json();
	const session = await auth();
	if (!session || !session.user.vendorId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const decodedLocationId = decodeId(locationId);

	const [firstName, lastName] = session.user.name?.split(" ") || [];
	const user = {
		firstName,
		lastName,
		email: session.user.email,
		phone: session.user.phone,
		avatar: session.user.image,
		stripeCustomerId: session.user.stripeCustomerId,
		role: session.user.role,
	};

	try {
		const newCase = await admindb.transaction(async (tx) => {
			const [newCase] = await tx.insert(supportCases).values({
				...rest,
				userId: session?.user.vendorId,
				locationId: decodedLocationId,
				metadata: user
			}).returning();

			await tx.insert(supportCaseMessages).values({
				caseId: newCase.id,
				content: rest.message,
				role: "user",
				type: "message"
			});
			const emailSender = new EmailSender();
			await emailSender.sendSupportEmail({
				options: {
					to: 'steve.y@mymonstro.com',
					subject: `Case#${newCase.id} created successfully`,
				},
				template: 'SupportConfirmation',
				data: {
					vendor: user,
					case: {
						...newCase,
						id: 100 + newCase.id
					}
				}
			});
			return newCase;
		});



		return NextResponse.json(newCase, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}