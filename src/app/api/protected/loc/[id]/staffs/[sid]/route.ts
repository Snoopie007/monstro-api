import { NextResponse } from 'next/server';
import { staffs } from '@/db/schemas';
import { db } from '@/db/db';
import { eq } from 'drizzle-orm';
type StaffProps = {
  sid: string
  id: string
}

export async function DELETE(req: Request, props: { params: Promise<StaffProps> }) {
  const params = await props.params;

  try {
    await db.delete(staffs).where(eq(staffs.id, params.sid))
    return NextResponse.json({ success: true }, { status: 200 })

  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}

export async function PUT(req: Request, props: { params: Promise<StaffProps> }) {
  const params = await props.params;

  const data = await req.json()
  try {
    await db.update(staffs).set({
      ...data,
      updatedAt: new Date()
    }).where(eq(staffs.id, params.sid))
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}