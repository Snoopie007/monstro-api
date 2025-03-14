import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';
import { contractTemplates } from '@/db/schemas/ContractTemplates';
import { eq } from 'drizzle-orm';


export async function GET(req: Request, props: { params: Promise<{ cid: number, id: string }> }) {
  const params = await props.params;

  try {

    const template = await db.query.contractTemplates.findFirst({
      where: (templates, { eq }) => eq(templates.id, params.cid),
    })
    console.log(template);
    return NextResponse.json(template, { status: 200 });

  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 })
  }
}

export async function PUT(req: Request, props: { params: Promise<{ cid: string, id: string }> }) {
  const { cid } = await props.params;

  try {

    if (!cid) {
      return NextResponse.json({ error: "Contract ID is required" }, { status: 400 });
    }

    const result = await db
      .update(contractTemplates)
      .set({
        ...req.body,
        updated: new Date(),
      })
      .where(eq(contractTemplates.id, Number(cid)))
      .returning();

    if (!result.length) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Contract updated successfully", data: result }, { status: 200 });

  } catch (error) {

    console.error("Error updating contract:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });

  }

}

export async function DELETE(req: NextRequest, props: { params: { cid: string } }) {
  try {

    const { cid } = props.params;

    const result = await db.delete(contractTemplates).where(eq(contractTemplates.id, Number(cid))).returning();


    if (!result.length) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }


    return NextResponse.json({ message: "Contract deleted successfully" }, { status: 200 });

  } catch (error) {
    console.error("Error deleting contract:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}