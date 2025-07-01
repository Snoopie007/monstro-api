import {NextRequest, NextResponse} from "next/server";

import {db} from "@/db/db";

type InvoiceProps = {
  mid: number;
  id: number;
};

export async function GET(
  req: Request,
  props: {params: Promise<InvoiceProps>}
) {
  const params = await props.params;
  try {
    const invoices = await db.query.memberInvoices.findMany({
      where: (memberInvoices, {eq, and}) =>
        and(
          eq(memberInvoices.memberId, params.mid),
          eq(memberInvoices.locationId, params.id)
        ),
    });

    return NextResponse.json(invoices, {status: 200});
  } catch (err) {
    return NextResponse.json({error: err}, {status: 500});
  }
}
