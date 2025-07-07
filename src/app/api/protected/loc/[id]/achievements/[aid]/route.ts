import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { achievements } from "@/db/schemas";
import { eq } from "drizzle-orm";

type Params = {
  aid: string;
  id: string;
};

export async function GET(req: Request, props: { params: Promise<Params> }) {
  const params = await props.params;
  try {
    const achievement = await db.query.achievements.findFirst({
      where: (achievement, { eq }) => eq(achievement.id, params.aid),
    });
    return NextResponse.json(achievement, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<Params> }) {
  const params = await props.params;
  const formData = await req.formData();

  // Extract form fields
  const data: any = {};
  for (const [key, value] of formData.entries()) {
    if (key !== "file") {
      data[key] = value;
    }
  }

  try {
    const achievement = await db
      .update(achievements)
      .set(data)
      .where(eq(achievements.id, params.aid))
      .returning({ id: achievements.id });
    return NextResponse.json(achievement, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<Params> }) {
  const params = await props.params;
  try {
    await db.delete(achievements).where(eq(achievements.id, params.aid));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
