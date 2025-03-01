import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { eq } from 'drizzle-orm';
import { decodeJWT } from '@/libs/utils';
import { members } from '@/db/schemas';


export async function GET(req: Request, props: { params: Promise<{ id: number }> }) {
	try {
    const params = await props.params;
		const token = req.headers.get("Authorization")?.split(" ")[1]
		const authMember = decodeJWT(token ?? "");
		if (authMember) {
      const member = await db.query.members.findFirst({
        where: (members, {eq}) => eq(members.id, Number(authMember.member?.id || 0)),
        with: {
          user: {
            columns: {
              id: true, name: true, email: true
            }
          }
        }
      });
      return NextResponse.json({member: {...member}}, { status: 200 })
		}
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}

export async function PUT(req: Request, props: { params: Promise<{ id: number }> }) {
  try {
    const params = await props.params;
		const token = req.headers.get("Authorization")?.split(" ")[1]
		const authMember = decodeJWT(token ?? "");
    const data: any = await req.json()
		if (authMember) { 
      let member = await db.query.members.findFirst({
        where: (members, {eq}) => eq(members.id, Number(authMember.member?.id || 0)),
        columns: {
          firstName: true,
          lastName: true,
          avatar: true
        }
      });
      const updatedMember = {
        firstName: data.firstName ?? member?.firstName,
        lastName: data.lastName ?? member?.lastName,
        avatar: data.avatar ?? member?.avatar
      }
      const update = await db.transaction(async (trx) => {
        return trx.update(members).set({
          ...updatedMember
        }).where(eq(members.id, Number(authMember.member?.id || 0))).returning()
      });
      return NextResponse.json({member: {...update}}, { status: 200 })
		}
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}