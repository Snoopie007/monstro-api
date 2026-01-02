import { auth } from "@/libs/auth/server";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { eq, and } from "drizzle-orm";
import { users, accounts } from "@/db/schemas";
import bcrypt from "bcryptjs";

type StaffPasswordProps = {
  sid: string;
  id: string;
}

export async function PATCH(req: Request, props: { params: Promise<StaffPasswordProps> }) {
  const { sid } = await props.params;
  const session = await auth();
  const { password, currentPassword } = await req.json();

  if (!session) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  }

  if (password === currentPassword) {
    return NextResponse.json({ message: 'Please use a different password for your new password.' }, { status: 400 });
  }

  try {
    // Look up staff and their associated user
    const staff = await db.query.staffs.findFirst({
      where: (staffs, { eq }) => eq(staffs.id, sid),
      with: {
        user: true,
      },
    });

    if (!staff || !staff.user) {
      return NextResponse.json({ message: 'Staff not found.' }, { status: 404 });
    }

    const user = staff.user;

    if (!user.password) {
      return NextResponse.json({ message: 'User has no password set.' }, { status: 400 });
    }

    const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidCurrentPassword) {
      return NextResponse.json({ message: 'Current password is incorrect.' }, { status: 400 });
    }

    const newHashedPassword: string = await bcrypt.hash(password, 10);

    // Update users table with the correct user.id
    await db.update(users).set({ password: newHashedPassword }).where(eq(users.id, user.id));

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
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

