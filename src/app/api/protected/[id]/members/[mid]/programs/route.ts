import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';
import { and, count, eq, ilike, or, sql } from 'drizzle-orm';
import { enrollments, memberLocations, members, } from '@/db/schemas';
import { Program } from '@/types';

export async function GET(req: Request, props: { params: Promise<{ mid: number, id: number }> }) {
  const params = await props.params;
  try {
  const session = await auth();
  if (session) {
    const reservations = await db.query.enrollments.findMany({
      where: (enrollments, {eq}) => eq(enrollments.memberId, params.mid),
      with: {
        session: {
          with: {
            program: {
              with: {
                plans: {
                  with: {
                    pricing: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const programs: Array<Program> = [];
    reservations.forEach(element => {
      if(element.session && element.session.program) {
        programs.push(element.session.program);
      }
    });

    return NextResponse.json(programs, { status: 200 });
  }
} catch (err) {
  return NextResponse.json({ error: err }, { status: 500 })
}
}