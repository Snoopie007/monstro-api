import { db } from '@/db/db'
import { supportConversations } from '@/db/schemas/'
import { notifyUsersNewSupportConversation } from '@/libs/novu'
import { broadcastSupportConversation, formatSupportConversationPayload } from '@/libs/support-broadcast'
import type { SupportConversation } from '@/types'
import { Elysia } from 'elysia'
import { z } from "zod";

const MemberLocationSupportProps = {
    params: z.object({
        mid: z.string(),
        lid: z.string(),
    }),
    body: z.object({
        assistantId: z.string(),
    }),
};

export function mlSupportRoutes(app: Elysia) {
    return app
        .get('/support', async ({ params, status }) => {
            const { mid, lid } = params

            try {
                const conversations =
                    await db.query.supportConversations.findMany({
                        where: (b, { eq, and }) =>
                            and(eq(b.locationId, lid), eq(b.memberId, mid)),
                    })

                if (!conversations) {
                    return status(404, { error: 'No support assistant found' })
                }

                return status(200, conversations)
            } catch (error) {
                console.error('Database error:', error)
                return status(500, {
                    error: 'Failed to fetch support conversations',
                })
            }
        }, MemberLocationSupportProps)
        .post('/support', async ({ params, status, body }) => {
            const { mid, lid } = params

            try {
                console.log(
                    'Creating support conversation',
                    JSON.stringify(body)
                )

                // Fetch location with vendor information
                const location = await db.query.locations.findFirst({
                    where: (l, { eq }) => eq(l.id, lid),
                    with: {
                        vendor: {
                            with: {
                                user: true,
                            },
                        },
                    },
                })

                if (!location) {
                    return status(404, { error: 'Location not found' })
                }

                // Fetch member information
                const member = await db.query.members.findFirst({
                    where: (m, { eq }) => eq(m.id, mid),
                })

                if (!member) {
                    return status(404, { error: 'Member not found' })
                }

                const assistant =
                    await db.query.supportAssistants.findFirst({
                        where: (b, { eq, and }) =>
                            and(eq(b.locationId, lid)),
                    })

                if (!assistant) {
                    return status(404, {
                        error: 'Support assistant not found',
                    })
                }

                const [conversation] = await db
                    .insert(supportConversations)
                    .values({
                        memberId: mid,
                        locationId: lid,
                        supportAssistantId: assistant.id,
                    })
                    .returning()

                if (conversation) {
                    // Broadcast new conversation to Supabase Realtime (for dashboard)
                    try {
                        await broadcastSupportConversation(
                            lid,
                            formatSupportConversationPayload(conversation as SupportConversation),
                            'conversation_inserted'
                        )
                    } catch (broadcastError) {
                        console.error('Failed to broadcast new conversation:', broadcastError)
                    }

                    // Fetch all active staff members for this location
                    const staffMembers =
                        await db.query.staffsLocations.findMany({
                            where: (sl, { eq, and }) =>
                                and(
                                    eq(sl.locationId, lid),
                                    eq(sl.status, 'active')
                                ),
                            with: {
                                staff: {
                                    with: {
                                        user: true,
                                    },
                                },
                            },
                        })

                    const staffUserIds = staffMembers
                        .map((sl) => sl.staff.user?.id)
                        .filter((id): id is string => !!id)

                    if (location.vendor?.userId) {
                        const vendorAndStaffIds = [
                            location.vendor.userId,
                            ...staffUserIds,
                        ]



                        const result = await notifyUsersNewSupportConversation({
                            users: vendorAndStaffIds,
                            memberName: `${member.firstName} ${member.lastName || ''
                                }`.trim(),
                            locationName: location.name,
                            locationId: location.id,
                        })

                        if (result.error) {
                            console.error(
                                'Failed to send Novu notification:',
                                result.error
                            )
                        }

                        console.log(
                            '🔔 Notification queued for users:',
                            vendorAndStaffIds
                        )
                    }
                }

                return status(200, conversation)
            } catch (error) {
                console.error('Database error:', error)
                return status(500, {
                    error: 'Failed to create support conversation',
                })
            }
        }, MemberLocationSupportProps)
}
