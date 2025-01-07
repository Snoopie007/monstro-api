import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';
import { cp } from 'fs';

export async function GET(req: Request, props: { params: Promise<{ mid: number, id: number }> }) {
    const params = await props.params;
    try {
        const session = await auth();
        if (session) {
            const enrollments = await db.query.enrollments.findMany({
                where: (enrollments, { eq }) => eq(enrollments.memberId, params.mid),
                with: {
                    attendances: true,
                    session: {
                        with: {
                            program: true
                        }
                    }
                }
            });

            const attendances = enrollments.flatMap(e =>
                e.attendances.map(att => ({
                    ...att,
                    program: e.session?.program || null
                }))
            );

            return NextResponse.json(attendances, { status: 200 });
        }
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}
