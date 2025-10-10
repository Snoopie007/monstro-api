
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { eq } from 'drizzle-orm';
import { programSessions, programs as program, programs } from '@/db/schemas';
import { ProgramSession } from '@/types';
import { format, addMinutes, setHours, setMinutes, setSeconds, startOfDay } from 'date-fns';
import { hasPermission } from '@/libs/server/permissions';


export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
	const params = await props.params;
	const { searchParams } = new URL(req.url);
	const pageSize = parseInt(searchParams.get('size') || "20");
	const page = parseInt(searchParams.get('page') || "1");
	const type = searchParams.get('type');

	/** Authentication will be implemented in a future update */

	try {
		const programs = await db.query.programs.findMany({
			limit: pageSize,
			offset: (page - 1) * pageSize,
			where: (program, { eq }) => eq(program.locationId, params.id),
			with: {
				planPrograms: {
					with: {
						plan: {
							columns: {
								id: true,
								name: true,
								type: true,
							}
						}
					}
				}
			},
			extras: {
				counts: db.$count(program, eq(program.locationId, params.id)).as("counts")
			}
		})

		return NextResponse.json(programs, { status: 200 });
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}


export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
	const params = await props.params;
	const { sessions, ...data } = await req.json();
	
	try {

		const canAddProgram = await hasPermission("add program", params.id);
		if (!canAddProgram) {
			return NextResponse.json({ error: "Access denied" }, { status: 403 });
		}
		await db.transaction(async (tx) => {
			/** 
			 * Create the main program record with location ID and other data
			 * from the request body
			 */
			const [program] = await tx.insert(programs).values({
				locationId: params.id,
				...data
			}).returning({ id: programs.id });


			await tx.insert(programSessions).values(sessions.map(({ id, ...s }: ProgramSession)  => ({
				...s,
				status: 1,
				programId: program.id,
			})));
		});

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}

function convertLocalTimeToUTC(localTime: string, timezoneOffset: string): string {
    const [hours, minutes, seconds] = localTime.split(':').map(Number);
    
    // Parse timezone offset (e.g., "+08:00" -> 8, "-05:00" -> -5)
    const offsetMatch = timezoneOffset.match(/([+-])(\d{2}):(\d{2})/);
    if (!offsetMatch) return localTime;
    
    const sign = offsetMatch[1] === '+' ? 1 : -1;
    const offsetHours = parseInt(offsetMatch[2]) * sign;
    const offsetMinutes = parseInt(offsetMatch[3]) * sign;
    const totalOffsetMinutes = (offsetHours * 60) + offsetMinutes;
    
    // Create date with the local time
    let date = startOfDay(new Date());
    date = setHours(date, hours);
    date = setMinutes(date, minutes);
    date = setSeconds(date, seconds || 0);
    
    // Convert to UTC by subtracting the offset
    const utcDate = addMinutes(date, -totalOffsetMinutes);
    
    return format(utcDate, 'HH:mm:ss');
}