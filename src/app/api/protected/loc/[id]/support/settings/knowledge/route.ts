import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { Params } from 'next/dist/server/request/params'
import { db } from '@/db/db'
import { supportAssistants } from '@subtrees/schemas'

export async function GET(
    req: NextRequest,
    props: { params: Promise<Params> }
) {
    const { id: assistantId } = await props.params
    try {
        const knowledge = await db.query.supportAssistants.findFirst({
            where: eq(supportAssistants.id, assistantId as string),
        })
        return NextResponse.json(
            { success: true, data: knowledge?.knowledgeBase },
            { status: 200 }
        )
    } catch (error) {
        console.error('Error fetching knowledge:', error)
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
        const { qa_entries, document } = data
        const knowledge = await db
            .update(supportAssistants)
            .set({
                knowledgeBase: {
                    qa_entries,
                    document,
                },
            })
            .where(eq(supportAssistants.id, assistantId as string))
            .returning()
        return NextResponse.json(
            { success: true, data: knowledge },
            { status: 200 }
        )
    } catch (error) {
        console.error('Error updating knowledge:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
