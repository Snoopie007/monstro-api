import { db } from '@/db/db'
import { supportAssistants, supportTriggers } from '@/db/schemas'
import { eq } from 'drizzle-orm'
import { Params } from 'next/dist/server/request/params'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
    req: NextRequest,
    props: { params: Promise<Params> }
) {
    const { id } = await props.params
    try {
        const triggers = await db.query.supportTriggers.findMany({
            where: eq(supportTriggers.supportAssistantId, id as string),
        })
        return NextResponse.json(
            { success: true, data: triggers },
            { status: 200 }
        )
    } catch (error) {
        console.error('Error fetching triggers:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function POST(
    req: NextRequest,
    props: { params: Promise<Params> }
) {
    const { id: assistantId } = await props.params
    const data = await req.json()
    try {
        const existingAssistant = await db.query.supportAssistants.findFirst({
            where: eq(supportAssistants.id, assistantId as string),
        })
        if (!existingAssistant) {
            return NextResponse.json(
                { error: 'Support assistant not found' },
                { status: 404 }
            )
        }
        const trigger = await db.insert(supportTriggers).values({
            ...data,
            supportAssistantId: assistantId,
        }).returning()

        return NextResponse.json(
            { success: true, data: trigger },
            { status: 200 }
        )
    } catch (error) {
        console.error('Error creating trigger:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function PATCH(
    req: NextRequest,
    props: { params: Promise<Params> }
) {
    const { id: assistantId } = await props.params
    const data = await req.json()
    try {
        const existingAssistant = await db.query.supportAssistants.findFirst({
            where: eq(supportAssistants.id, assistantId as string),
        })
        if (!existingAssistant) {
            return NextResponse.json(
                { error: 'Support assistant not found' },
                { status: 404 }
            )
        }

        const trigger = await db
            .update(supportTriggers)
            .set(data)
            .where(eq(supportTriggers.id, data.id))
            .returning()
        return NextResponse.json(
            { success: true, data: trigger },
            { status: 200 }
        )
    } catch (error) {
        console.error('Error updating trigger:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    req: NextRequest,
    props: { params: Promise<Params> }
) {
    const { id: assistantId } = await props.params
    const data = await req.json()
    try {
        const existingAssistant = await db.query.supportAssistants.findFirst({
            where: eq(supportAssistants.id, assistantId as string),
        })
        if (!existingAssistant) {
            return NextResponse.json(
                { error: 'Support assistant not found' },
                { status: 404 }
            )
        }

        const existingTrigger = await db.query.supportTriggers.findFirst({
            where: eq(supportTriggers.id, data.id),
        })
        if (!existingTrigger) {
            return NextResponse.json(
                { error: 'Trigger not found' },
                { status: 404 }
            )
        }
        const trigger = await db.delete(supportTriggers).where(eq(supportTriggers.id, data.id))
        return NextResponse.json(
            { success: true, data: trigger },
            { status: 200 }
        )
    } catch (error) {
        console.error('Error deleting trigger:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}