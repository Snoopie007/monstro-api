import { NextResponse } from 'next/server';
import { db } from "@/db/db";
import { eq } from 'drizzle-orm';
import { rewards } from '@/db/schemas';


type RewardProps = {
  rid: number,
  id: number
}

export async function GET(request: Request, props: { params: Promise<RewardProps> }) {
  const params = await props.params;

  try {
    const reward = await db.query.rewards.findFirst({
      where: (rewards, { eq }) => eq(rewards.id, params.rid)
    })
    return NextResponse.json(reward, { status: 200 })
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 })
  }
}

export async function POST(req: Request, props: { params: Promise<RewardProps> }) {
  const params = await props.params;
  const data = await req.json()
  try {

    const reward = await db.insert(rewards).values({
      ...data,
      locationId: params.id
    }).returning({ id: rewards.id })
    return NextResponse.json(reward, { status: 200 })



  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}

export async function DELETE(req: Request, props: { params: Promise<RewardProps> }) {
  const params = await props.params;


  try {
    await db.delete(rewards).where(eq(rewards.id, params.rid))
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}

export async function PUT(req: Request, props: { params: Promise<RewardProps> }) {
  const params = await props.params;
  const data = await req.json()
  try {

    const reward = await db.update(rewards).set({
      ...data,
      locationId: params.id
    }).where(eq(rewards.id, params.rid)).returning({ id: rewards.id })
    return NextResponse.json(reward, { status: 200 })
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}