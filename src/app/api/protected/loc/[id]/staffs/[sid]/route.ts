import { NextResponse } from 'next/server';
import { staffs, staffsLocationRoles, staffLocations } from '@/db/schemas';
import { db } from '@/db/db';
import { eq, and } from 'drizzle-orm';


type StaffProps = {
  sid: string;
  id: string;
  lid: string;
}

export async function DELETE(req: Request, props: { params: Promise<StaffProps> }) {
  const { lid, sid } = await props.params;

  try {
    await db.transaction(async (tx) => {
      await tx.delete(staffLocations).where(
        and(
          eq(staffLocations.staffId, sid),
          eq(staffLocations.locationId, lid)
        )
      )

      await tx.delete(staffsLocationRoles).where(
        eq(staffsLocationRoles.staffLocationId, sid)
      )

      await tx.delete(staffs).where(eq(staffs.id, sid))
    })
    return NextResponse.json({ success: true }, { status: 200 })

  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}

export async function PATCH(req: Request, props: { params: Promise<StaffProps> }) {
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