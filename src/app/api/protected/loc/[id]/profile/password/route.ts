import { auth } from "@/auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { users } from "@/db/schemas";

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();

  const { password, currentPassword, confirmPassword } = await req.json()


  if (password === currentPassword) {
    return NextResponse.json({ message: 'Please a different password for your new password.' }, { status: 400 })
  }

  try {

    if (session) {

      const user = await db.query.users.findFirst({
        where: (user, { eq }) => eq(user.id, session.user.id)
      })

      if (!user || !user.password) {
        return NextResponse.json({ message: 'User not found.' }, { status: 404 })
      }

      const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password)

      if (!isValidCurrentPassword) {
        return NextResponse.json({ message: 'Current password is incorrect.' }, { status: 400 })
      }

      const salt = await bcrypt.genSalt(10);
      const newHashedPassword: string = await bcrypt.hash(password, salt);

      await db.update(users).set({ password: newHashedPassword }).where(eq(users.id, session.user.id))


      return NextResponse.json({ success: true }, { status: 200 });
    }
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}