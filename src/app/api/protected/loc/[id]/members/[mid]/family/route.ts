import { NextResponse } from "next/server";

import { db } from "@/db/db";
import { eq, and, sql, isNull } from "drizzle-orm";

import {
	familyMembers,
	locations,
	memberLocations,
	members,
	users,
	memberSubscriptions,
	memberPlans,
	memberPackages,
} from "@/db/schemas";
import { MonstroData } from "@/libs/data";
import { EmailSender } from "@/libs/server/emails";
import { MemberRelationship } from "@/types/DatabaseEnums";

type Props = {
	mid: string;
	id: string;
};
const emailSender = new EmailSender();


function getInverseRelationship(
	relationship: MemberRelationship
): MemberRelationship {
	const relationshipMap: Record<MemberRelationship, MemberRelationship> = {
		parent: "child",
		child: "parent",
		spouse: "spouse",
		sibling: "sibling",
		other: "other",
	};

	return relationshipMap[relationship] || "other";
}

export async function POST(req: Request, props: { params: Promise<Props> }) {
	try {
		const params = await props.params;
		const {
			firstName,
			lastName,
			email,
			phone,
			familyMemberId,
			relationship,
			familyPlanId,
		} = await req.json();
		let emailUrl = "";
		let newMember = false;

		const location = await db.query.locations.findFirst({
			where: eq(locations.id, params.id),
		});

		if (!location) {
			return NextResponse.json(
				{ error: "Location not found" },
				{ status: 404 }
			);
		}

		let member = await db.query.members.findFirst({
			where: eq(members.email, email),
		});

		if (!member) {
			const [user] = await db
				.insert(users)
				.values({
					name: firstName,
					email: email,
					password: "",
					created: new Date(),
				})
				.returning();

			const generateReferralCode = () => {
				return Math.random().toString(36).substring(2, 8).toUpperCase();
			};

			[member] = await db
				.insert(members)
				.values({
					userId: user.id,
					firstName: firstName,
					lastName: lastName,
					email: email,
					phone: phone,
					referralCode: generateReferralCode(),
					created: new Date(),
				})
				.returning();

			newMember = true;
		}

		const familyMember = await db.query.members.findFirst({
			where: eq(members.id, familyMemberId),
		});

		if (!familyMember) {
			return NextResponse.json(
				{ error: "Family member not found" },
				{ status: 404 }
			);
		}

		const familyPlan = await db.query.memberPlans.findFirst({
			where: (memberPlans, { eq }) => eq(memberPlans.id, familyPlanId),
		});

		if (!familyPlan) {
			return NextResponse.json({ error: "Plan not found" }, { status: 404 });
		}
		let memberSubscription = undefined;
		let memberPackage = undefined;
		if (familyPlan.type == "one-time") {
			const activeMemberPackage = await db.query.memberPackages.findMany({
				where: (memberSubscriptions, { eq }) =>
					and(
						eq(memberSubscriptions.memberPlanId, familyPlanId),
						eq(memberSubscriptions.memberId, familyMemberId),
						isNull(memberSubscriptions.parentId),
						eq(memberSubscriptions.locationId, params.id),
						eq(memberSubscriptions.status, "active")
					),
			});

			for await (const pkg of activeMemberPackage) {
				const childSubCount = await db
					.select({
						count: sql<number>`count(*)`,
					})
					.from(memberPackages)
					.where(eq(memberPackages.parentId, pkg.id));

				if (
					childSubCount.length &&
					childSubCount[0].count < familyPlan.familyMemberLimit
				) {
					memberPackage = pkg;
				}
			}
		} else if (familyPlan.type == "recurring") {
			const activeMemberSubscriptions =
				await db.query.memberSubscriptions.findMany({
					where: (memberSubscriptions, { eq }) =>
						and(
							eq(memberSubscriptions.memberPlanId, familyPlanId),
							eq(memberSubscriptions.memberId, familyMemberId),
							isNull(memberSubscriptions.parentId),
							eq(memberSubscriptions.locationId, params.id),
							eq(memberSubscriptions.status, "active"),
							isNull(memberSubscriptions.endedAt)
						),
				});

			for await (const subscription of activeMemberSubscriptions) {
				const childSubCount = await db
					.select({
						count: sql<number>`count(*)`,
					})
					.from(memberSubscriptions)
					.where(eq(memberSubscriptions.parentId, subscription.id));

				if (
					childSubCount.length &&
					childSubCount[0].count < familyPlan.familyMemberLimit
				) {
					memberSubscription = subscription;
				}
			}
		}

		const memberLocation = await db.query.memberLocations.findFirst({
			where: (memberLocation, { eq }) =>
				and(
					eq(memberLocation.memberId, member.id),
					eq(memberLocation.locationId, location.id)
				),
		});
		if (!memberLocation) {
			const newLocation = await db.insert(memberLocations).values({
				memberId: member.id,
				locationId: params.id,
				status: "active",
				//set remaining parameters so that member just has to enter password to complete the signup
			});
		}
		if (familyPlan.type == "one-time" && memberPackage) {
			await db.insert(memberPackages).values({
				memberPlanId: familyPlanId,
				locationId: params.id,
				startDate: memberPackage.startDate,
				memberId: member.id,
				parentId: memberPackage.id,
				paymentMethod: memberPackage.paymentMethod,
				status: "active",
			});
			emailUrl = `invite/${params.id}/pkg/${memberPackage.id}`;
		} else if (familyPlan.type == "recurring" && memberSubscription) {
			await db.insert(memberSubscriptions).values({
				memberPlanId: familyPlanId,
				locationId: params.id,
				status: "active",
				startDate: memberSubscription.startDate,
				currentPeriodStart: memberSubscription.currentPeriodStart,
				paymentMethod: memberSubscription.paymentMethod,
				memberId: member.id,
				parentId: memberSubscription.id,
				currentPeriodEnd: memberSubscription.currentPeriodEnd,
			});
			emailUrl = `invite/${params.id}/sub/${memberSubscription.id}`;

			// try {
			// 	await evaluateTriggers({
			// 		memberId: member.id,
			// 		locationId: params.id,
			// 		triggerType: 'plan_signup',
			// 		data: { memberPlanId: familyPlanId }
			// 	});
			// } catch (error) {
			// 	console.error('Error evaluating plan signup triggers:', error);
			// 	// Don't fail the request if trigger evaluation fails
			// }
		}

		await db.transaction(async (tx) => {
			// Insert the original relationship
			await tx.insert(familyMembers).values({
				relatedMemberId: member.id,
				memberId: familyMemberId,
				relationship: relationship,
				created: new Date(),
			});

			// Insert the inverse relationship
			await tx.insert(familyMembers).values({
				relatedMemberId: familyMemberId,
				memberId: member.id,
				relationship: getInverseRelationship(relationship),
				created: new Date(),
			});
		});

		if (newMember) {
			await emailSender.send({
				options: {
					to: member.email,
					subject: "Family Member Invitation",
				},
				template: "MemberInvite",
				data: {
					ui: { button: "Join the class.", btnUrl: emailUrl },
					location: { name: location?.name },
					monstro: MonstroData,
					member: { name: firstName },
				},
			});
		} else {
			// add email template for members who already have an account
		}
		return NextResponse.json({
			message: "New member created and family member relationship established",
		});
		// }
	} catch (error) {
		console.error(error);
		return NextResponse.json({ error: "An error occurred" }, { status: 500 });
	}
}
