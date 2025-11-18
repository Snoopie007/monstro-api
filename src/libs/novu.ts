/**
 * Novu Notification Service
 * Using REST API for server-side notification triggering
 */

type NovuTriggerPayload = {
    to: {
        subscriberId: string
        email?: string
        firstName?: string
        lastName?: string
    }
    payload: Record<string, any>
    overrides?: Record<string, any>
}

type NotifyUsersParams = {
    users: {
        id: string,
        email: string,
    }[]
    memberName: string
    locationName: string
    locationId: string
}

/**
 * Trigger a Novu workflow notification
 */
async function triggerNovuWorkflow(
    workflowId: string,
    payload: NovuTriggerPayload
): Promise<{ success: boolean; error?: any }> {
    const NOVU_API_KEY = process.env.NOVU_API_KEY
    const NOVU_API_URL = 'https://api.novu.co/v1/events/trigger'

    if (!NOVU_API_KEY) {
        console.error('❌ NOVU_API_KEY is not set')
        return { success: false, error: 'NOVU_API_KEY not configured' }
    }

    try {
        const response = await fetch(NOVU_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `ApiKey ${NOVU_API_KEY}`,
            },
            body: JSON.stringify({
                name: workflowId,
                ...payload,
            }),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error('❌ Novu API error:', response.status, errorData)
            return { success: false, error: errorData }
        }
        console.log('✅ Novu notification triggered successfully:', workflowId)
        return { success: true }
    } catch (error) {
        console.error('❌ Failed to trigger Novu notification:', error)
        return { success: false, error }
    }
}

export async function notifyUsersNewSupportConversation({
    users,
    memberName,
    locationName,
    locationId,
}: NotifyUsersParams) {
    const WORKFLOW_ID = 'vendor-new-support-conversation'
    const notifications: Promise<{ success: boolean; error?: any }>[] = []

    if (users.length === 0) {
        return { success: true, error: 'No users to notify' }
    }

    users.forEach((user) => {
        notifications.push(
            triggerNovuWorkflow(WORKFLOW_ID, {
                to: {
                    subscriberId: user.id,
                    email: user.email,
                },
                payload: {
                    memberName,
                    locationName,
                    url: `/dashboard/location/${locationId}/support/`,
                    timestamp: new Date().toISOString(),
                },
            })
        )
    })

    const results = await Promise.allSettled(notifications)
    const success = results.filter(
        (r) => r.status === 'fulfilled' && r.value.success
    ).length
    const failed = results.length - success
    const errors = results
        .filter((r) => r.status === 'rejected' || !r.value.success)
        .map((r) => (r.status === 'rejected' ? r.reason : r.value.error))

    return { success, failed, errors }
}

export async function notifyUsersNewGroupPost({
    users,
    memberName,
    locationName,
    locationId,
}: NotifyUsersParams) {
    const WORKFLOW_ID = 'new-group-post'
    const notifications: Promise<{ success: boolean; error?: any }>[] = []
    if (users.length === 0) {
        return { success: true, error: 'No users to notify' }
    }

    users.forEach((user) => {
        notifications.push(
            triggerNovuWorkflow(WORKFLOW_ID, {
                to: {
                    subscriberId: user.id,
                    email: user.email,
                },
                payload: {
                    memberName,
                    locationName,
                    url: `https://app.monstro-x.com/dashboard/location/${locationId}/groups/`,
                    timestamp: new Date().toISOString(),
                },
            })
        )
    })

    const results = await Promise.allSettled(notifications)
    const success = results.filter(
        (r) => r.status === 'fulfilled' && r.value.success
    ).length
    const failed = results.length - success
    const errors = results
        .filter((r) => r.status === 'rejected' || !r.value.success)
        .map((r) => (r.status === 'rejected' ? r.reason : r.value.error))

    return { success, failed, errors }
}

export async function notifyUsersNewGroupChatMessage({
    users,
    memberName,
    locationName,
    locationId,
}: NotifyUsersParams) {
    const WORKFLOW_ID = 'new-group-chat-message'
    const notifications: Promise<{ success: boolean; error?: any }>[] = []

    if (users.length === 0) {
        return { success: true, error: 'No users to notify' }
    }

    users.forEach((user) => {
        notifications.push(
            triggerNovuWorkflow(WORKFLOW_ID, {
                to: {
                    subscriberId: user.id,
                    email: user.email,
                },
                payload: {
                    memberName,
                    locationName,
                    url: `https://app.monstro-x.com/dashboard/location/${locationId}/groups/`,
                    timestamp: new Date().toISOString(),
                },
            })
        )
    })
 
    const results = await Promise.allSettled(notifications)
    const success = results.filter(
        (r) => r.status === 'fulfilled' && r.value.success
    ).length
    const failed = results.length - success
    const errors = results
        .filter((r) => r.status === 'rejected' || !r.value.success)
        .map((r) => (r.status === 'rejected' ? r.reason : r.value.error))

    return { success, failed, errors }
}

export async function notifyUsersNewPostComment({
    users,
    memberName,
    locationName,
    locationId,
}: NotifyUsersParams) {
    const WORKFLOW_ID = 'new-post-comment'
    const notifications: Promise<{ success: boolean; error?: any }>[] = []

    if (users.length === 0) {
        return { success: true, error: 'No users to notify' }
    }

    users.forEach((user) => {
        notifications.push(
            triggerNovuWorkflow(WORKFLOW_ID, {
                to: {
                    subscriberId: user.id,
                    email: user.email,
                },
                payload: {
                    memberName,
                    locationName,
                    url: `https://app.monstro-x.com/dashboard/location/${locationId}/groups/`,
                    timestamp: new Date().toISOString(),
                },
            })
        )
    })

    const results = await Promise.allSettled(notifications)
    const success = results.filter(
        (r) => r.status === 'fulfilled' && r.value.success
    ).length
    const failed = results.length - success
    const errors = results
        .filter((r) => r.status === 'rejected' || !r.value.success)
        .map((r) => (r.status === 'rejected' ? r.reason : r.value.error))

    return { success, failed, errors }
}