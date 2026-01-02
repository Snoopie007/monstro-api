import { NextResponse } from 'next/server';
import { staffs, staffsLocationRoles, staffLocations } from '@/db/schemas';
import { db } from '@/db/db';
import { eq, and } from 'drizzle-orm';


type StaffProps = {
  sid: string;
  id: string;
}

export async function DELETE(req: Request, props: { params: Promise<StaffProps> }) {
  const { id, sid } = await props.params;

  try {
    await db.transaction(async (tx) => {
      // First, get the staff location record to get its ID
      const staffLocation = await tx.query.staffLocations.findFirst({
        where: and(
          eq(staffLocations.staffId, sid),
          eq(staffLocations.locationId, id)
        )
      });

      if (staffLocation) {
        // Delete roles using the correct staffLocation.id
        await tx.delete(staffsLocationRoles).where(
          eq(staffsLocationRoles.staffLocationId, staffLocation.id)
        );
        
        // Delete staff location
        await tx.delete(staffLocations).where(
          eq(staffLocations.id, staffLocation.id)
        );
      }

      // Delete the staff record
      await tx.delete(staffs).where(eq(staffs.id, sid));
    });
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
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