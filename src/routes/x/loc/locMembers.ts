import { db } from "@/db/db";
import type { Elysia } from "elysia";
import {
    memberCustomFields,
    memberFields,
    memberHasTags,
    memberLocations,
    members,
    memberTags,
} from "@/db/schemas";
import { and, asc, desc, eq, exists, ilike, inArray, ne, or, sql } from "drizzle-orm";
import type {
    LocationMembersQuery,
    MemberCustomFieldValue,
    MemberSortableField,
    MemberTag,
} from "@/types/member";

const sortColumns = {
    created: members.created,
    updated: members.updated,
    firstName: members.firstName,
    lastName: members.lastName,
    email: members.email,
    dob: members.dob,
} as const;

const normalizeEnumValue = (columnId: string, value: string): string => {
    switch (columnId) {
        case 'status': {
            const statusMap: Record<string, string> = {
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
        }
        case 'gender': {
            const genderMap: Record<string, string> = {
                'male': 'Male',
                'female': 'Female',
                'other': 'Other'
            };
            return genderMap[value.toLowerCase()] || value;
        }
        default:
            return value;
    }
};

function locMembers(app: Elysia) {
    return app.get('/', async (ctx) => {
        const { params, status, query } = ctx;
        const { lid } = params as { lid: string };
        const {
            size,
            page,
            query: searchQuery,
            tags,
            tagOperator,
            sortBy,
            sortOrder,
            columnFilters: columnFiltersParam
        } = query as LocationMembersQuery;

        const pageSize = parseInt(size || "100");
        const pageNumber = parseInt(page || "1");
        const tagIds = tags?.split(",").filter(Boolean) || [];
        const filterByTag = tagOperator || "OR";
        const sortField = (sortBy || 'created') as MemberSortableField;
        const sortDir = sortOrder || 'desc';
        const columnFilters = columnFiltersParam ? JSON.parse(columnFiltersParam) : [];

        try {
            const baseCondition = and(
                eq(memberLocations.locationId, lid),
                ne(memberLocations.status, 'archived')
            );

            const searchCondition = searchQuery ? or(
                ilike(members.firstName, `%${searchQuery}%`),
                ilike(members.lastName, `%${searchQuery}%`)
            ) : undefined;

            let tagCondition;
            if (tagIds.length > 0) {
                if (filterByTag === "AND") {
                    tagCondition = sql`
                        (
                            SELECT COUNT(DISTINCT ${memberHasTags.tagId})
                            FROM ${memberHasTags}
                            WHERE ${memberHasTags.memberId} = ${members.id}
                            AND ${memberHasTags.tagId} = ANY(ARRAY[${sql.join(tagIds.map(id => sql`${id}`), sql`, `)}])
                        ) = ${tagIds.length}
                    `;
                } else {
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

            const columnFilterConditions: any[] = [];
            if (columnFilters.length > 0) {
                for (const filter of columnFilters) {
                    const { id, value } = filter;
                    if (!value || value === '') continue;

                    switch (id) {
                        case 'name':
                            columnFilterConditions.push(or(
                                ilike(members.firstName, `%${value}%`),
                                ilike(members.lastName, `%${value}%`)
                            ));
                            break;
                        case 'email':
                            columnFilterConditions.push(ilike(members.email, `%${value}%`));
                            break;
                        case 'phone':
                            columnFilterConditions.push(ilike(members.phone, `%${value}%`));
                            break;
                        case 'gender':
                            columnFilterConditions.push(eq(members.gender, normalizeEnumValue('gender', value)));
                            break;
                        case 'status':
                            columnFilterConditions.push(eq(memberLocations.status, normalizeEnumValue('status', value) as any));
                            break;
                        default:
                            if (id.startsWith('custom-field-')) {
                                const fieldId = id.replace('custom-field-', '');
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
                                );
                            }
                            break;
                    }
                }
            }

            const conditions = [baseCondition];
            if (searchCondition) conditions.push(searchCondition);
            if (tagCondition) conditions.push(tagCondition);
            if (columnFilterConditions.length > 0) {
                conditions.push(and(...columnFilterConditions));
            }
            const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];

            const sortColumn = sortColumns[sortField] || members.created;
            const sortDirection = sortDir === 'asc' ? asc : desc;

            const membersResult = await db
                .select({
                    id: members.id,
                    userId: members.userId,
                    firstName: members.firstName,
                    lastName: members.lastName,
                    email: members.email,
                    phone: members.phone,
                    avatar: members.avatar,
                    created: members.created,
                    updated: members.updated,
                    dob: members.dob,
                    gender: members.gender,
                    firstTime: members.firstTime,
                    referralCode: members.referralCode,
                    stripeCustomerId: members.stripeCustomerId,
                    memberLocation: {
                        status: memberLocations.status,
                    },
                })
                .from(memberLocations)
                .innerJoin(members, eq(memberLocations.memberId, members.id))
                .where(whereCondition)
                .orderBy(sortDirection(sortColumn))
                .limit(pageSize)
                .offset((pageNumber - 1) * pageSize);

            const memberIds = membersResult.map((m) => m.id);
            let memberTagsMap: Record<string, MemberTag[]> = {};

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

                memberTagsMap = memberTagsResult.reduce((acc, row) => {
                    if (!acc[row.memberId]) {
                        acc[row.memberId] = [];
                    }
                    acc[row.memberId]!.push({
                        id: row.tagId,
                        name: row.tagName,
                    });
                    return acc;
                }, {} as Record<string, MemberTag[]>);
            }

            let memberCustomFieldsMap: Record<string, MemberCustomFieldValue[]> = {};

            if (memberIds.length > 0) {
                const memberCustomFieldsResult = await db
                    .select({
                        memberId: memberCustomFields.memberId,
                        fieldId: memberCustomFields.customFieldId,
                        value: memberCustomFields.value,
                    })
                    .from(memberCustomFields)
                    .where(inArray(memberCustomFields.memberId, memberIds));

                memberCustomFieldsMap = memberCustomFieldsResult.reduce((acc, row) => {
                    if (!acc[row.memberId]) {
                        acc[row.memberId] = [];
                    }
                    acc[row.memberId]!.push({
                        fieldId: row.fieldId,
                        value: row.value,
                    });
                    return acc;
                }, {} as Record<string, MemberCustomFieldValue[]>);
            }

            const membersWithTagsAndCustomFields = membersResult.map((member) => ({
                ...member,
                tags: memberTagsMap[member.id] || [],
                customFields: memberCustomFieldsMap[member.id] || [],
            }));

            const totalCountResult = await db
                .select({ count: sql<number>`count(*)` })
                .from(memberLocations)
                .innerJoin(members, eq(memberLocations.memberId, members.id))
                .where(whereCondition);

            const totalCount = totalCountResult[0]?.count || 0;

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
                .where(eq(memberFields.locationId, lid));

            return status(200, {
                count: totalCount,
                members: membersWithTagsAndCustomFields,
                customFields,
            });
        } catch (err) {
            console.error(err);
            return status(500, { error: "Internal Server Error" });
        }
    });
}

export { locMembers };
