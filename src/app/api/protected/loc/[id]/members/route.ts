import { NextResponse, NextRequest } from 'next/server'
import { auth } from '@/libs/auth/server'
import { db } from '@/db/db'
import {
    and,
    eq,
    ne,
    ilike,
    or,
    sql,
    inArray,
    exists,
    desc,
    asc,
} from 'drizzle-orm'
import {
    memberLocations,
    members,
    users,
    memberTags,
    memberHasTags,
    memberCustomFields,
    memberFields,
} from '@/db/schemas'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { MemberSortableField, sortColumnMap } from '@/types/member'
import { hasPermission } from "@/libs/server/permissions";
import { generateUsername, generateDiscriminator } from "./utils";

export async function GET(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {

    const params = await props.params
    const { searchParams } = new URL(req.url)

    const pageSize = parseInt(searchParams.get('size') || '100')
    const page = parseInt(searchParams.get('page') || '1')
    const query = searchParams.get('query') || '' // Search string
    const tagIds = searchParams.get('tags')?.split(',').filter(Boolean) || [] // Tag filtering
    const tagOperator = searchParams.get('tagOperator') || 'OR' // AND or OR logic for tags
    const sortBy = searchParams.get('sortBy') || 'created' // Sort column
    const sortOrder = searchParams.get('sortOrder') || 'desc' // Sort direction

    // Parse column filters
    const columnFiltersParam = searchParams.get('columnFilters')
    const columnFilters = columnFiltersParam ? JSON.parse(columnFiltersParam) : []

    try {
        const session = await auth()

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Base condition: Filter by locationId from memberLocations
        const baseCondition = and(
            eq(memberLocations.locationId, params.id),
            ne(memberLocations.status, 'archived')
        )

        // Optional search condition for members (case-insensitive match)
        const searchCondition = query
            ? or(
                ilike(members.firstName, `%${query}%`), // Match firstName
                ilike(members.lastName, `%${query}%`) // Match lastName
            )
            : undefined

        // Tag filtering condition
        let tagCondition
        if (tagIds.length > 0) {
            if (tagOperator === 'AND') {
                // Member must have ALL specified tags
                tagCondition = sql`
					(
						SELECT COUNT(DISTINCT ${memberHasTags.tagId})
						FROM ${memberHasTags}
						WHERE ${memberHasTags.memberId} = ${members.id}
						AND ${memberHasTags.tagId} = ANY(ARRAY[${sql.join(tagIds.map(id => sql`${id}`), sql`, `)}])
					) = ${tagIds.length}
				`
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
                )
            }
        }

        // Helper function to normalize enum values
        const normalizeEnumValue = (columnId: string, value: string): string => {
            switch (columnId) {
                case 'status':
                    // Status values should be lowercase and match the enum
                    const statusMap: { [key: string]: string } = {
                        'active': 'active',
                        'inactive': 'incomplete',
                        'past due': 'past_due',
                        'canceled': 'canceled',
                        'cancelled': 'canceled',
                        'paused': 'paused',
                        'trialing': 'trialing',
                        'unpaid': 'unpaid',
                        'incomplete': 'incomplete',
                        'incomplete expired': 'incomplete_expired',
                        'incomplete_expired': 'incomplete_expired',
                        'archived': 'archived'
                    };
                    return statusMap[value.toLowerCase()] || value.toLowerCase();
                case 'gender':
                    // Gender values can be case-insensitive, normalize to proper case
                    const genderMap: { [key: string]: string } = {
                        'male': 'Male',
                        'female': 'Female',
                        'other': 'Other'
                    };
                    return genderMap[value.toLowerCase()] || value;
                default:
                    return value;
            }
        };

        let columnFilterConditions: any[] = []
        if (columnFilters.length > 0) {
            for (const filter of columnFilters) {
                const { id, value } = filter
                if (!value || value === '') continue // Skip empty filters

                switch (id) {
                    case 'name':
                        columnFilterConditions.push(or(ilike(members.firstName, `%${value}%`), ilike(members.lastName, `%${value}%`)))
                        break
                    case 'email':
                        columnFilterConditions.push(ilike(members.email, `%${value}%`))
                        break
                    case 'phone':
                        columnFilterConditions.push(ilike(members.phone, `%${value}%`))
                        break
                    case 'gender':
                        columnFilterConditions.push(eq(members.gender, normalizeEnumValue('gender', value)))
                        break
                    case 'status':
                        columnFilterConditions.push(eq(memberLocations.status, normalizeEnumValue('status', value) as any))
                        break
                    default:
                        // Handle custom fields - check if it's a custom field ID
                        if (id.startsWith('custom-field-')) {
                            const fieldId = id.replace('custom-field-', '')
                            columnFilterConditions.push(
                                exists(
                                    db
                                        .select({ memberId: memberCustomFields.memberId })
                                        .from(memberCustomFields)
                                        .where(
                                            and(
                                                eq(memberCustomFields.memberId, members.id),
                                                eq(memberCustomFields.customFieldId, fieldId),
                                                ilike(memberCustomFields.value, `%${value}%`)
                                            )
                                        )
                                )
                            )
                        }
                        break
                }
            }
        }

        // Combine all conditions
        const conditions = [baseCondition]
        if (searchCondition) conditions.push(searchCondition)
        if (tagCondition) conditions.push(tagCondition)
        if (columnFilterConditions.length > 0) {
            conditions.push(and(...columnFilterConditions))
        }
        const whereCondition =
            conditions.length > 1 ? and(...conditions) : conditions[0]

        const sortColumn =
            sortColumnMap[sortBy as MemberSortableField] || members.created
        const sortDirection = sortOrder === 'asc' ? asc : desc

        // Fetch members with all conditions and their tags
        const membersResult = await db
            .select({
                id: members.id,
                userId: members.userId,
                firstName: members.firstName,
                lastName: members.lastName,
                email: members.email,
                phone: members.phone,
                created: members.created,
                updated: members.updated,
                dob: members.dob,
                gender: members.gender,
                referralCode: members.referralCode,
                stripeCustomerId: members.stripeCustomerId,
                avatar: users.image,
                memberLocation: {
                    status: memberLocations.status,
                },
            })
            .from(memberLocations)
            .innerJoin(members, eq(memberLocations.memberId, members.id))
            .innerJoin(users, eq(members.userId, users.id))
            .where(whereCondition)
            .orderBy(sortDirection(sortColumn))
            .limit(pageSize)
            .offset((page - 1) * pageSize)

        // Get tags for each member
        const memberIds = membersResult.map((m) => m.id)
        let memberTagsMap: Record<string, any[]> = {}

        if (memberIds.length > 0) {
            const memberTagsResult = await db
                .select({
                    memberId: memberHasTags.memberId,
                    tagId: memberTags.id,
                    tagName: memberTags.name,
                })
                .from(memberHasTags)
                .innerJoin(memberTags, eq(memberHasTags.tagId, memberTags.id))
                .where(inArray(memberHasTags.memberId, memberIds))

            // Group tags by member ID
            memberTagsMap = memberTagsResult.reduce((acc, row) => {
                if (!acc[row.memberId]) {
                    acc[row.memberId] = []
                }
                acc[row.memberId].push({
                    id: row.tagId,
                    name: row.tagName,
                })
                return acc
            }, {} as Record<string, any[]>)
        }

        // Get custom fields for each member
        let memberCustomFieldsMap: Record<string, any[]> = {}

        if (memberIds.length > 0) {
            const memberCustomFieldsResult = await db
                .select({
                    memberId: memberCustomFields.memberId,
                    fieldId: memberCustomFields.customFieldId,
                    value: memberCustomFields.value,
                })
                .from(memberCustomFields)
                .where(inArray(memberCustomFields.memberId, memberIds))

            // Group custom fields by member ID
            memberCustomFieldsMap = memberCustomFieldsResult.reduce(
                (acc, row) => {
                    if (!acc[row.memberId]) {
                        acc[row.memberId] = []
                    }
                    acc[row.memberId].push({
                        fieldId: row.fieldId,
                        value: row.value,
                    })
                    return acc
                },
                {} as Record<string, any[]>
            )
        }

        // Add tags and custom fields to each member
        const membersWithTagsAndCustomFields = membersResult.map((member) => ({
            ...member,
            tags: memberTagsMap[member.id] || [],
            customFields: memberCustomFieldsMap[member.id] || [],
        }))

        // Fetch the total count (with the same conditions)
        const totalCountResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(memberLocations)
            .innerJoin(members, eq(memberLocations.memberId, members.id))
            .where(whereCondition)

        const totalCount = totalCountResult[0]?.count || 0

        // Fetch custom fields for this location
        const customFields = await db
            .select({
                id: memberFields.id,
                name: memberFields.name,
                type: memberFields.type,
                placeholder: memberFields.placeholder,
                helpText: memberFields.helpText,
                options: memberFields.options,
                locationId: memberFields.locationId,
                created: memberFields.created,
                updated: memberFields.updated,
            })
            .from(memberFields)
            .where(eq(memberFields.locationId, params.id))

        // Return the paginated result, total count, and custom fields
        return NextResponse.json(
            {
                count: totalCount,
                members: membersWithTagsAndCustomFields,
                customFields: customFields,
            },
            { status: 200 }
        )
    } catch (err) {
        console.error(err)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params
    const { invite, ...data } = await req.json()

    const formattedPhone = parsePhoneNumberFromString(data.phone, 'US')?.number
    if (!formattedPhone) {
        return NextResponse.json(
            { error: 'Invalid phone number' },
            { status: 400 }
        )
    }

    try {
        const locationState = await db.query.locationState.findFirst({
            where: (locationState, { eq }) =>
                eq(locationState.locationId, params.id),
        })

        if (!locationState) {
            return NextResponse.json(
                { error: 'No valid location not found' },
                { status: 404 }
            )
        }

        const canEditAuth = await hasPermission("add member", params.id);
        if (!canEditAuth) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const existing = await db.query.members.findFirst({
            where: (member, { eq }) => eq(member.email, data.email),
            with: {
                memberLocations: true,
            },
        })

        if (existing) {
            return NextResponse.json(
                { existing: true, member: existing },
                { status: 200 }
            )
        }

        let user = await db.query.users.findFirst({
            where: (user, { eq }) => eq(user.email, data.email),
            columns: {
                id: true,
            },
        })

        if (!user) {
            const canAddAuth = await hasPermission("add member", params.id);
            if (!canAddAuth) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }

            /** Create User if there isn't one */
            const [res] = await db
                .insert(users)
                .values({
                    name: `${data.firstName} ${data.lastName}`,
                    email: data.email,
                    username: generateUsername(`${data.firstName} ${data.lastName}`),
                    discriminator: generateDiscriminator(),
                })
                .returning()

            user = res
        }

        const generateReferralCode = () => {
            return Math.random().toString(36).substring(2, 8).toUpperCase()
        }

        const member = await db.transaction(async (tx) => {
            const [member] = await tx
                .insert(members)
                .values({
                    ...data,
                    dob: data.dob ? new Date(data.dob) : null,
                    userId: user.id,
                    phone: formattedPhone,
                    referralCode: generateReferralCode(),
                })
                .returning({
                    id: members.id,
                    firstName: members.firstName,
                    lastName: members.lastName,
                    email: members.email,
                    phone: members.phone,
                })

            await tx.insert(memberLocations).values({
                locationId: params.id,
                memberId: member.id,
                status: 'incomplete',
            })

            return member
        })

        // Evaluate referral triggers if this member was referred
        // if (data.referralCode) {
        //     try {
        //         // Find the referrer by their referral code
        //         const referrer = await db.query.members.findFirst({
        //             where: eq(members.referralCode, data.referralCode),
        //         });

        //         if (referrer) {
        //             await triggerIncrement({
        //                 mid: referrer.id,
        //                 lid: params.id,
        //                 type: 'Referrals Count',
        //                 amount: 1,
        //             });
        //         }
        //     } catch (error) {
        //         console.error('Error evaluating referral triggers:', error);
        //         // Don't fail the request if trigger evaluation fails
        //     }
        // }

        return NextResponse.json({ existing: false, member }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}
