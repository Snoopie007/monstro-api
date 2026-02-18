import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/db'
import { and, eq, gte, lte, or, isNull } from 'drizzle-orm'
import { reservations } from '@subtrees/schemas'

type Props = {
    params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, props: Props) {
    const params = await props.params
    const { searchParams } = new URL(req.url)
    
    const dateStr = searchParams.get('date')
    const programId = searchParams.get('programId')
    
    if (!dateStr) {
        return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }
    
    try {
        const targetDate = new Date(dateStr)
        const dayOfWeek = targetDate.getDay()
        
        const programs = await db.query.programs.findMany({
            where: (p, { eq, and }) => {
                const conditions = [
                    eq(p.locationId, params.id),
                    eq(p.status, 'active'),
                ]
                if (programId) {
                    conditions.push(eq(p.id, programId))
                }
                return and(...conditions)
            },
            with: {
                sessions: true,
            },
        })
        
        const startOfDay = new Date(targetDate)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(targetDate)
        endOfDay.setHours(23, 59, 59, 999)
        
        const slots = []
        
        for (const program of programs) {
            const sessionsForDay = program.sessions.filter(
                s => s.day === dayOfWeek
            )
            
            for (const session of sessionsForDay) {
                const existingReservations = await db.query.reservations.findMany({
                    where: and(
                        eq(reservations.sessionId, session.id),
                        gte(reservations.startOn, startOfDay),
                        lte(reservations.startOn, endOfDay),
                        or(eq(reservations.status, 'confirmed'), isNull(reservations.status))
                    ),
                })
                
                const capacity = program.capacity ?? 20
                const availableSpots = Math.max(0, capacity - existingReservations.length)
                
                if (availableSpots > 0) {
                    slots.push({
                        sessionId: session.id,
                        time: session.time,
                        programName: program.name,
                        availableSpots,
                        duration: session.duration,
                    })
                }
            }
        }
        
        slots.sort((a, b) => a.time.localeCompare(b.time))
        
        return NextResponse.json({ slots }, { status: 200 })
    } catch (err) {
        console.error('Failed to fetch available sessions:', err)
        return NextResponse.json({ error: 'Failed to fetch available sessions' }, { status: 500 })
    }
}
