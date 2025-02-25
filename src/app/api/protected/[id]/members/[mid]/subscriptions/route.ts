import { db } from "@/db/db";
import { NextResponse } from "next/server";

export async function GET(req: Request, props: { params: Promise<{ id: number, mid: number }> }) {
    const params = await props.params;

    try {
        const subscriptions = await db.query.memberSubscriptions.findMany({
            where: (memberSubscriptions, { eq, and }) => and(
                eq(memberSubscriptions.beneficiaryId, params.mid),
                eq(memberSubscriptions.locationId, params.id)
            ),
            with: {
                plan: {
                    with: {
                        program: true,
                        pricing: true
                    }
                },
                payer: {
                    columns: {
                        id: true,
                        firstName: true,
                    }
                },
            }
        })

        return NextResponse.json(subscriptions, { status: 200 })
    } catch (err) {
        // console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}