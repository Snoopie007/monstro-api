import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { eq } from 'drizzle-orm';
import { roles } from '@/db/schemas';
import { db } from '@/db/db';

type RoleProps = {
  rid: number,
  id: number
}
export async function DELETE(req: Request, props: { params: Promise<RoleProps> }) {
  const params = await props.params;

  try {
    await db.delete(roles).where(eq(roles.id, params.rid))
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}

export async function PUT(req: Request, props: { params: Promise<RoleProps> }) {
  const params = await props.params;
  const data = await req.json()

  try {

    const role = await db.update(roles).set({
      ...data,
      locationId: params.id
    }).where(eq(roles.id, params.rid)).returning({ id: roles.id })
    return NextResponse.json(role, { status: 200 })
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}