import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { contractTemplates } from '@subtrees/schemas/contracts';
import { eq } from 'drizzle-orm';
import { hasPermission } from '@/libs/server/permissions';

type ContractId = {
  cid: string;
  id: string;
}

export async function GET(req: Request, props: { params: Promise<ContractId> }) {
  const params = await props.params;

  try {

    const template = await db.query.contractTemplates.findFirst({
      where: (templates, { eq }) => eq(templates.id, params.cid),
    })
    return NextResponse.json(template, { status: 200 });

  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, props: { params: Promise<ContractId> }) {
  const { cid, id } = await props.params;
  const data = await req.json();
  try {
    const canEditContract = await hasPermission("edit contract", id);
    if (!canEditContract) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (!cid) {
      return NextResponse.json({ error: "Contract ID is required" }, { status: 400 });
    }

    const result = await db.update(contractTemplates).set({
      ...data,
      updated: new Date(),
    }).where(eq(contractTemplates.id, cid)).returning();

    if (!result.length) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Contract updated successfully", data: result }, { status: 200 });

  } catch (error) {

    console.error("Error updating contract:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });

  }

}

export async function DELETE(req: NextRequest, props: { params: Promise<ContractId> }) {
  const { cid, id } = await props.params;
  try {
    const canDeleteContract = await hasPermission("delete contract", id);
    if (!canDeleteContract) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const result = await db.delete(contractTemplates).where(eq(contractTemplates.id, cid)).returning();


    if (!result.length) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }


    return NextResponse.json({ message: "Contract deleted successfully" }, { status: 200 });

  } catch (error) {
    console.error("Error deleting contract:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}