import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { eq } from 'drizzle-orm';
import { decodeJWT } from '@/libs/utils';
import { users } from '@/db/schemas';
import bcrypt from 'bcryptjs';

export async function PUT(req: Request, props: { params: Promise<{ id: number }> }) {
  try {
		const token = req.headers.get("Authorization")?.split(" ")[1]
		const authMember = decodeJWT(token ?? "");
    const data: any = await req.json()
		if (authMember) { 
      let user = await db.query.users.findFirst({
        where: (users, {eq}) => eq(users.id, Number(authMember.id || 0)),
        columns: {
          password: true
        }
      });
      if(user && user.password) {
        const match = await bcrypt.compare(`${data.password}`, user.password);
        if(match) return NextResponse.json({ error: "Invalid current Password" }, { status: 400 }) 
          const salt = await bcrypt.genSalt(10);
        const hashedPassword: string = await bcrypt.hash(data.newPassword, salt);
        const updatedMember = {
          password: hashedPassword
        }
        await db.transaction(async (trx) => {
          return trx.update(users).set({
            ...updatedMember
          }).where(eq(users.id, Number(authMember.id || 0))).returning()
        });
        return NextResponse.json("Updated", { status: 200 })

      }

		}
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}