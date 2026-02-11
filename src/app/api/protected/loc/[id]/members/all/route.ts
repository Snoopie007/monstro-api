import { db } from '@/db/db'
import {
    memberCustomFields,
    memberFields,
    memberHasTags,
    memberLocations,
    members,
    memberTags,
    users,
} from '@/db/schemas'
import { auth } from '@/libs/auth/server'
import { CustomFieldDefinition, MemberListItem } from '@/types/member'
import { and, eq, inArray, ne } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params

    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Base condition: exclude archived only (fetch ALL other members)
        const baseCondition = and(
            eq(memberLocations.locationId, params.id),
            ne(memberLocations.status, 'archived')
        )

        // Fetch ALL members - NO PAGINATION
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
            .where(baseCondition)
        // NO .limit() or .offset() - fetch all

        // Fetch tags for all members
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

            memberTagsMap = memberTagsResult.reduce((acc, row) => {
                if (!acc[row.memberId]) acc[row.memberId] = []
                acc[row.memberId].push({ id: row.tagId, name: row.tagName })
                return acc
            }, {} as Record<string, any[]>)
        }

        // Fetch custom fields for all members
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

            memberCustomFieldsMap = memberCustomFieldsResult.reduce((acc, row) => {
                if (!acc[row.memberId]) acc[row.memberId] = []
                acc[row.memberId].push({ fieldId: row.fieldId, value: row.value })
                return acc
            }, {} as Record<string, any[]>)
        }

        // Combine members with their tags and custom fields
        const membersWithData = membersResult.map((member) => ({
            ...member,
            phone: member.phone ?? '',
            created: String(member.created),
            updated: member.updated ? String(member.updated) : null,
            dob: member.dob ? String(member.dob) : null,
            memberLocation: { status: String(member.memberLocation.status) },
            tags: (memberTagsMap[member.id] || []) as MemberListItem['tags'],
            customFields: (memberCustomFieldsMap[member.id] || []) as MemberListItem['customFields'],
        })) as unknown as MemberListItem[]

        // Fetch custom field definitions for this location
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
            .where(eq(memberFields.locationId, params.id)) as CustomFieldDefinition[]

        return NextResponse.json({
            members: membersWithData,
            customFields: customFields,
        }, { status: 200 })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
