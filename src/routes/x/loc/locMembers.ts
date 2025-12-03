import { db } from "@/db/db";
import type { Elysia } from "elysia";

import {
    memberCustomFields,
    memberHasTags,
    memberLocations,
    members,
    memberTags,
} from "@/db/schemas";
import { and, eq, exists, ilike, inArray, or, sql } from "drizzle-orm";




type PostBody = {
    memberId: string;
    status: string;
}

type GetQuery = {
    size: string;
    page: string;
    query: string;
    tags: string;
    tagOperator: string;
}

type Props = {
    params: {
        mid: string;
    };
    status: any;

}

function locMembers(app: Elysia) {
    return app.group('/members/:mid', (app) => {


        return app;
    }).get('/', async (ctx) => {
        const { params, status, query } = ctx;
        const { mid } = params as { mid: string };
        const { size, page, tags, tagOperator } = query as GetQuery;

        const pageSize = parseInt(size || "100");
        const pageNumber = parseInt(page || "1");
        const tagIds = tags?.split(",").filter(Boolean) || []; // Tag filtering
        const filterByTag = tagOperator || "OR"; // AND or OR logic for tags

        try {


            // Base condition: Filter by locationId from memberLocations
            const baseCondition = eq(memberLocations.locationId, mid);

            // Optional search condition for members (case-insensitive match)
            const searchCondition = query ? or(
                ilike(members.firstName, `%${query}%`), // Match firstName
                ilike(members.lastName, `%${query}%`) // Match lastName
            ) : undefined;

            // Tag filtering condition
            let tagCondition;
            if (tagIds.length > 0) {
                if (filterByTag === "AND") {
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
                .offset((pageNumber - 1) * pageSize);

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
                    acc[row.memberId]?.push({
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
                    acc[row.memberId]?.push({
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
            return status(200, {
                count: totalCount,
                members: membersWithTagsAndCustomFields,
            });

        } catch (err) {
            console.error(err);
            return status(500, { error: "Internal Server Error" });
        }
    });
}

export { locMembers };
