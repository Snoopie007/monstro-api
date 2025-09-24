import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { and, eq, ilike, or, sql, inArray, exists } from "drizzle-orm";
import {
	memberLocations,
	members,
	users,
	memberTags,
	memberHasTags,
	memberCustomFields,
	memberFields,
} from "@/db/schemas";
import { parsePhoneNumberFromString } from "libphonenumber-js";

export async function GET(
	req: Request,
	props: { params: Promise<{ id: string }> }
) {
	const params = await props.params;

	const { searchParams } = new URL(req.url);

	const pageSize = parseInt(searchParams.get("size") || "100");
	const page = parseInt(searchParams.get("page") || "1");
	const query = searchParams.get("query") || ""; // Search string
	const tagIds = searchParams.get("tags")?.split(",").filter(Boolean) || []; // Tag filtering
	const tagOperator = searchParams.get("tagOperator") || "OR"; // AND or OR logic for tags

	try {
		const session = await auth();

		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Base condition: Filter by locationId from memberLocations
		const baseCondition = eq(memberLocations.locationId, params.id);

		// Optional search condition for members (case-insensitive match)
		const searchCondition = query
			? or(
				ilike(members.firstName, `%${query}%`), // Match firstName
				ilike(members.lastName, `%${query}%`) // Match lastName
			)
			: undefined;

		// Tag filtering condition
		let tagCondition;
		if (tagIds.length > 0) {
			if (tagOperator === "AND") {
				// Member must have ALL specified tags
				tagCondition = sql`
					(
						SELECT COUNT(DISTINCT ${memberHasTags.tagId})
						FROM ${memberHasTags}
						WHERE ${memberHasTags.memberId} = ${members.id}
						AND ${memberHasTags.tagId} = ANY(${tagIds})
					) = ${tagIds.length}
				`;
			} else {
				// Member must have ANY of the specified tags (OR)
				tagCondition = exists(
					db
						.select({ tagId: memberHasTags.tagId })
						.from(memberHasTags)
						.where(
							and(
								eq(memberHasTags.memberId, members.id),
								inArray(memberHasTags.tagId, tagIds)
							)
						)
				);
			}
		}

		// Combine all conditions
		const conditions = [baseCondition];
		if (searchCondition) conditions.push(searchCondition);
		if (tagCondition) conditions.push(tagCondition);
		const whereCondition =
			conditions.length > 1 ? and(...conditions) : conditions[0];

		// Fetch members with all conditions and their tags
		const membersResult = await db
			.select({
				id: members.id,
				firstName: members.firstName,
				lastName: members.lastName,
				email: members.email,
				phone: members.phone,
				avatar: members.avatar,
				memberLocation: {
					status: memberLocations.status,
				},
			})
			.from(memberLocations)
			.innerJoin(members, eq(memberLocations.memberId, members.id))
			.where(whereCondition)
			.limit(pageSize)
			.offset((page - 1) * pageSize);

		// Get tags for each member
		const memberIds = membersResult.map((m) => m.id);
		let memberTagsMap: Record<string, any[]> = {};

		if (memberIds.length > 0) {
			const memberTagsResult = await db
				.select({
					memberId: memberHasTags.memberId,
					tagId: memberTags.id,
					tagName: memberTags.name,
				})
				.from(memberHasTags)
				.innerJoin(memberTags, eq(memberHasTags.tagId, memberTags.id))
				.where(inArray(memberHasTags.memberId, memberIds));

			// Group tags by member ID
			memberTagsMap = memberTagsResult.reduce((acc, row) => {
				if (!acc[row.memberId]) {
					acc[row.memberId] = [];
				}
				acc[row.memberId].push({
					id: row.tagId,
					name: row.tagName,
				});
				return acc;
			}, {} as Record<string, any[]>);
		}

		// Get custom fields for each member
		let memberCustomFieldsMap: Record<string, any[]> = {};

		if (memberIds.length > 0) {
			const memberCustomFieldsResult = await db
				.select({
					memberId: memberCustomFields.memberId,
					fieldId: memberCustomFields.customFieldId,
					value: memberCustomFields.value,
				})
				.from(memberCustomFields)
				.where(inArray(memberCustomFields.memberId, memberIds));

			// Group custom fields by member ID
			memberCustomFieldsMap = memberCustomFieldsResult.reduce((acc, row) => {
				if (!acc[row.memberId]) {
					acc[row.memberId] = [];
				}
				acc[row.memberId].push({
					fieldId: row.fieldId,
					value: row.value,
				});
				return acc;
			}, {} as Record<string, any[]>);
		}

		// Add tags and custom fields to each member
		const membersWithTagsAndCustomFields = membersResult.map((member) => ({
			...member,
			tags: memberTagsMap[member.id] || [],
			customFields: memberCustomFieldsMap[member.id] || [],
		}));

		// Fetch the total count (with the same conditions)
		const totalCountResult = await db
			.select({ count: sql<number>`count(*)` })
			.from(memberLocations)
			.innerJoin(members, eq(memberLocations.memberId, members.id))
			.where(whereCondition);

		const totalCount = totalCountResult[0]?.count || 0;

		// Return the paginated result and total count
		return NextResponse.json(
			{
				count: totalCount,
				members: membersWithTagsAndCustomFields,
			},
			{ status: 200 }
		);
	} catch (err) {
		console.error(err);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 }
		);
	}
}

export async function POST(
	req: NextRequest,
	props: { params: Promise<{ id: string }> }
) {
	const params = await props.params;
	const { invite, ...data } = await req.json();

	const formattedPhone = parsePhoneNumberFromString(data.phone, "US")?.number;
	if (!formattedPhone) {
		throw new Error("Invalid phone number");
	}

	try {
		const locationState = await db.query.locationState.findFirst({
			where: (locationState, { eq }) => eq(locationState.locationId, params.id),
		});

		if (!locationState) {
			return NextResponse.json(
				{ error: "No valid location not found" },
				{ status: 404 }
			);
		}

		// const [{ exists }] = await db.execute<{ exists: boolean }>(
		//     sql`select exists(${db.select({ n: sql`1` }).from(members).where(eq(members.email, data.email))}) as exists`
		// )

		const existing = await db.query.members.findFirst({
			where: (member, { eq }) => eq(member.email, data.email),
			with: {
				memberLocations: true,
			},
		});

		if (existing) {
			return NextResponse.json(
				{ existing: true, member: existing },
				{ status: 200 }
			);
		}

		let user = await db.query.users.findFirst({
			where: (user, { eq }) => eq(user.email, data.email),
			columns: {
				id: true,
			},
		});

		if (!user) {
			/** Create User if there isn't one */
			const [res] = await db
				.insert(users)
				.values({
					name: `${data.firstName} ${data.lastName}`,
					email: data.email,
				})
				.returning();

			user = res;
		}

		const generateReferralCode = () => {
			return Math.random().toString(36).substring(2, 8).toUpperCase();
		};

		const member = await db.transaction(async (tx) => {
			const [member] = await tx
				.insert(members)
				.values({
					...data,
					dob: data.dob ? new Date(data.dob) : null,
					userId: user.id,
					phone: parsePhoneNumberFromString(data.phone, "US")?.number,
					referralCode: generateReferralCode(),
				})
				.returning({
					id: members.id,
					firstName: members.firstName,
					lastName: members.lastName,
					email: members.email,
					phone: members.phone,
				});

			await tx.insert(memberLocations).values({
				locationId: params.id,
				memberId: member.id,
				status: "incomplete",
			});
			return member;
		});

		return NextResponse.json({ existing: false, member }, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}
