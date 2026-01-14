import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { taxRates } from "@/db/schemas";
import { eq } from "drizzle-orm";


type Props = {
    params: Promise<{ id: string; taxId: string }>
}
export async function POST(req: NextRequest, props: Props) {
    const params = await props.params;
    const { currentDefaultId } = await req.json();
    const { taxId } = params;
    try {

        await db.transaction(async (tx) => {
            await tx.update(taxRates).set({ isDefault: true, status: "active" }).where(eq(taxRates.id, taxId));
            await tx.update(taxRates).set({ isDefault: false }).where(eq(taxRates.id, currentDefaultId));
        });
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Failed to update tax rate" }, { status: 500 });
    }
}