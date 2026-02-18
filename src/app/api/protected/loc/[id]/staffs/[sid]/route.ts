import { NextResponse } from 'next/server';
import { staffs, staffsLocations, userRoles } from '@subtrees/schemas';
import { db } from '@/db/db';
import { eq, and } from 'drizzle-orm';


type StaffProps = {
  sid: string;
  id: string;
}

export async function DELETE(req: Request, props: { params: Promise<StaffProps> }) {
  const { id, sid } = await props.params;
  const staffId = Number(sid);
  if (!Number.isInteger(staffId)) {
    return NextResponse.json({ error: 'Invalid staff id' }, { status: 400 });
  }

  try {
    await db.transaction(async (tx) => {
      // First, get the staff location record to get its ID
      const staffLocation = await tx.query.staffsLocations.findFirst({
        where: and(
          eq(staffsLocations.staffId, staffId),
          eq(staffsLocations.locationId, id)
        )
      });

      if (staffLocation) {
        const staff = await tx.query.staffs.findFirst({
          where: eq(staffs.id, staffId),
          columns: { userId: true },
        });
        if (staff?.userId) {
          await tx.delete(userRoles).where(eq(userRoles.userId, staff.userId));
        }
        
        // Delete staff location
        await tx.delete(staffsLocations).where(
          eq(staffsLocations.id, staffLocation.id)
        );
      }

      // Delete the staff record
      await tx.delete(staffs).where(eq(staffs.id, staffId));
    });
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<StaffProps> }) {
  const params = await props.params;
  const staffId = Number(params.sid);
  if (!Number.isInteger(staffId)) {
    return NextResponse.json({ error: 'Invalid staff id' }, { status: 400 });
  }

  const data = await req.json()
  try {
    await db.update(staffs).set({
      ...data,
      updatedAt: new Date()
    }).where(eq(staffs.id, staffId))
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}
