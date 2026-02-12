import { NextResponse } from "next/server";

import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { integrations } from "@subtrees/schemas";

export async function DELETE(
  req: Request,
  props: { params: Promise<{ iid: string}> }
) {
  const { iid } = await props.params;

  try {
    await db.delete(integrations).where(eq(integrations.id, iid));
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
