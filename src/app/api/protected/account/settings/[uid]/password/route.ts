import { auth } from "@/libs/auth/server";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { eq, and } from "drizzle-orm";
import { users, accounts } from "@/db/schemas";
import bcrypt from "bcryptjs";

export async function PATCH(req: Request, props: { params: Promise<{ uid: string }> }) {
  const { uid } = await props.params;
  const session = await auth();
  const { password, currentPassword } = await req.json()

  if (!session) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }


  if (password === currentPassword) {
    return NextResponse.json({ message: 'Please a different password for your new password.' }, { status: 400 })
  }

  try {

    const isVendor = uid.startsWith('vdr_');
    let user = null;
    if (isVendor) {
      const vendor = await db.query.vendors.findFirst({
        where: (vendor, { eq }) => eq(vendor.id, uid),
        with: {
          user: true,
        },
      })
      user = vendor?.user;
    } else {
      const staff = await db.query.staffs.findFirst({
        where: (staff, { eq }) => eq(staff.id, uid),
        with: {
          user: true,
        },
      })
      user = staff?.user;
    }

    if (!user || !user.password) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 })
    }

    const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password)

    if (!isValidCurrentPassword) {
      return NextResponse.json({ message: 'Current password is incorrect.' }, { status: 400 })
    }

    const newHashedPassword: string = await bcrypt.hash(password, 10)

    // Update users table
    await db.update(users).set({ password: newHashedPassword }).where(eq(users.id, user.id))

    // Update accounts table for Better Auth
    await db
      .update(accounts)
      .set({
        password: newHashedPassword,
      })
      .where(
        and(
          eq(accounts.userId, user.id),
          eq(accounts.provider, "credential")
        )
      );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}