import { db } from '@/db/db'
import { supportConversations } from 'subtrees/schemas'
import { notifyUsersNewSupportConversation } from '@/libs/novu'
import { broadcastSupportConversation, formatSupportConversationPayload } from '@/libs/broadcast'
import type { SupportConversation } from 'subtrees/types'
import { Elysia } from 'elysia'
import { z } from "zod"
import type { AuthContext } from '@/middlewares/AuthMW'
import { canAccessLocation } from '@/utils/merchandise'
import { WorkflowEvents } from '@subtrees/constants/workflow'
import { dispatchWorkflowTrigger } from '@subtrees/utils/server/workflows'

const SupportProps = {
    params: z.object({
        mid: z.string(),
        lid: z.string(),
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
        }, SupportProps)
        .post('/support', async (context) => {
            const { params, status } = context
            const actor = context as typeof context & AuthContext
            const { mid, lid } = params

            try {
                // Match check-in access: self, active staff at this location,
                // or a trusted service call. Never trust the URL member ID alone.
                if (actor.isServiceRole !== true && actor.memberId !== mid) {
                    const userId = actor.userId
                    const staff = userId ? await db.query.staffs.findFirst({
                        where: (row, { eq }) => eq(row.userId, userId),
                        columns: { id: true },
                    }) : undefined
                    const access = await canAccessLocation(lid, undefined, staff?.id)
                    if (!access.allowed) return status(403, { error: 'Access denied' })
                }

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

                const assistant = await db.query.supportAssistants.findFirst({
                    where: (b, { eq, and }) => and(eq(b.locationId, lid)),
                })

                if (!assistant) {
                    return status(404, {
                        error: 'Support assistant not found',
                    })
                }

                const conversation = await db.transaction(async (tx) => {
                    const membership = await tx.query.memberLocations.findFirst({
                        where: (row, { and, eq }) => and(eq(row.memberId, mid), eq(row.locationId, lid)),
                        columns: { memberId: true },
                    })
                    if (!membership) return null

                    // An empty conversation is already a new support ticket.
                    const [created] = await tx.insert(supportConversations).values({
                        memberId: mid, locationId: lid, supportAssistantId: assistant.id,
                    }).returning()
                    if (!created) throw new Error('Support conversation was not created')
                    await dispatchWorkflowTrigger(tx, {
                        type: WorkflowEvents.support.CREATED,
                        locationId: created.locationId,
                        memberId: created.memberId,
                        conversationId: created.id,
                    })
                    return created
                })
                if (!conversation) return status(404, { error: 'Member not found in this location' })

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

                    // Notification failure must not turn a committed creation into
                    // an HTTP 500 that encourages the client to create it again.
                    try {
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
                                        columns: { id: true },
                                        with: {
                                            user: { columns: { id: true, email: true } },
                                        },
                                    },
                                },
                            })

                        const staffUserIds = staffMembers
                            .map((sl) => ({
                                id: sl.staff.user?.id || '',
                                email: sl.staff.user?.email || '',
                            }))
                            .filter((user): user is { id: string; email: string } => !!user)

                        if (location.vendor?.userId) {
                            const vendorAndStaffUsers = [
                                {
                                    id: location.vendor.userId,
                                    email: location.vendor.user?.email || '',
                                },
                                ...staffUserIds,
                            ]



                            const result = await notifyUsersNewSupportConversation({
                                users: vendorAndStaffUsers,
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
                                vendorAndStaffUsers
                            )
                        }
                    } catch (notificationError) {
                        console.error('Failed to notify users of support conversation:', notificationError)
                    }
                }

                return status(200, conversation)
            } catch (error) {
                console.error('Database error:', error)
                return status(500, {
                    error: 'Failed to create support conversation',
                })
            }
        }, SupportProps)
}
