import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { db } from '@/db/db'
import type { ExtendedAttendance, MissedReservation } from '@/types/attendance'
import { sql } from 'drizzle-orm';

export async function GET(
    _req: NextRequest,
    props: { params: Promise<{ mid: string; id: string }> }
) {
    const params = await props.params

    try {
        const [attendanceRows, missedReservationsRows] = await Promise.all([
            db.execute(sql`
                SELECT 
                    a.*,
                    COALESCE(a.program_name, p.name, 'Unknown Program') as resolved_program_name,
                    COALESCE(a.program_id, p.id) as resolved_program_id
                FROM check_ins a
                LEFT JOIN reservations r ON a.reservation_id = r.id
                LEFT JOIN recurring_reservations rr ON a.recurring_id = rr.id
                LEFT JOIN program_sessions ps ON 
                    (r.session_id = ps.id OR rr.session_id = ps.id)
                LEFT JOIN programs p ON ps.program_id = p.id
                WHERE a.member_id = ${params.mid}
                    AND a.location_id = ${params.id}
                ORDER BY a.check_in_time DESC
            `),
            
            db.execute(sql`
                SELECT 
                    r.id,
                    r.start_on,
                    r.program_id,
                    COALESCE(r.program_name, p.name, 'Unknown Program') as program_name
                FROM reservations r
                LEFT JOIN programs p ON r.program_id = p.id
                WHERE r.member_id = ${params.mid}
                    AND r.location_id = ${params.id}
                    AND r.status = 'no_show'
                ORDER BY r.start_on DESC
            `)
        ])

        const attendances: ExtendedAttendance[] = attendanceRows.map((row: any) => ({
            id: row.id,
            reservationId: row.reservation_id,
            recurringId: row.recurring_id,
            programId: row.resolved_program_id,
            startTime: row.start_time,
            endTime: row.end_time,
            checkInTime: row.check_in_time,
            checkOutTime: row.check_out_time,
            ipAddress: row.ip_address,
            macAddress: row.mac_address,
            lat: row.lat,
            lng: row.lng,
            locationId: row.location_id,
            memberId: row.member_id,
            created: row.created_at ?? new Date(),
            programName: row.resolved_program_name,
        }))

        const missedReservations: MissedReservation[] = missedReservationsRows.map((row: any) => ({
            id: row.id,
            startOn: row.start_on,
            programId: row.program_id,
            programName: row.program_name,
        }))

        return NextResponse.json({
            attendances,
            missedReservations,
        }, { status: 200 })
    } catch (err) {
        console.error('Attendance fetch error:', err)
        return NextResponse.json({ error: 'Failed to fetch attendances' }, { status: 500 })
    }
}
