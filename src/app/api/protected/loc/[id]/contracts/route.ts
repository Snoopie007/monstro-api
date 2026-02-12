import { NextResponse } from "next/server";
import { db } from "@/db/db";

import { contractTemplates } from "@subtrees/schemas";
import { hasPermission } from "@/libs/server/permissions";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("withDraft") || true;
  try {
    const templates = await db.query.contractTemplates.findMany({
      where: (templates, { eq, and, inArray }) =>
        and(
          eq(templates.locationId, params.id),
          inArray(templates.isDraft, query === "true" ? [true, false] : [false])
        ),
    });

    return NextResponse.json(templates, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const data = await req.json();
  try {
    const canAddContract = await hasPermission("add contract", params.id);
    if (!canAddContract) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const [{ id }] = await db
      .insert(contractTemplates)
      .values({
        ...data,
        locationId: params.id,
        isDraft: true,
        editable: true,
      })
      .returning({ id: contractTemplates.id });

    return NextResponse.json({ id }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
