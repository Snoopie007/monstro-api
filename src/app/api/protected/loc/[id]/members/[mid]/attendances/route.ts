import { NextResponse } from 'next/server'
import type {NextRequest} from 'next/server'
import { db } from '@/db/db'
import type { ExtendedAttendance } from '@/types/attendance'
import { sql } from 'drizzle-orm';

/**
 * Retrieves attendance records for a specific member at a location,
 * enriched with program and level information from both subscriptions and packages.
 */
export async function GET(
    req: NextRequest,
    props: { params: Promise<{ mid: string; id: string }> }
) {
    const params = await props.params

    try {
        // Use raw SQL to join attendance with program info
        const attendanceRows = await db.execute(sql`
            SELECT 
                a.*,
                COALESCE(p.name, 'Unknown Program') as program_name
            FROM check_ins a
            LEFT JOIN reservations r ON a.reservation_id = r.id
            LEFT JOIN recurring_reservations rr ON a.recurring_id = rr.id
            LEFT JOIN program_sessions ps ON 
                (r.session_id = ps.id OR rr.session_id = ps.id)
            LEFT JOIN programs p ON ps.program_id = p.id
            WHERE a.member_id = ${params.mid}
                AND a.location_id = ${params.id}
            ORDER BY a.check_in_time DESC
        `)

        const attendanceList: ExtendedAttendance[] = attendanceRows.map((row: any) => ({
            id: row.id,
            reservationId: row.reservation_id,
            recurringId: row.recurring_id,
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
            programName: row.program_name,
        }))

        return NextResponse.json(attendanceList, { status: 200 })
    } catch (err) {
        console.log('Attendance fetch error:', err)
        return NextResponse.json({ error: 'Failed to fetch attendances' }, { status: 500 })
    }
}
