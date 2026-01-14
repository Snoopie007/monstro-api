import { db } from "@/db/db";
import { NextResponse, NextRequest } from "next/server";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params;

    try {
        // Get all cancelled subscriptions for this location
        const subs = await db.query.memberSubscriptions.findMany({
            where: (ms, { eq, or, isNotNull, and }) =>
                and(
                    eq(ms.locationId, id),
                    or(eq(ms.status, "canceled"), isNotNull(ms.endedAt))
                ),
            with: {
                member: true,
                pricing: {
                    with: {
                        plan: true,
                    }
                },
            },
        });

        // Transform to include plan at top level for backwards compatibility
        const transformedSubs = subs.map(sub => ({
            ...sub,
            plan: sub.pricing?.plan
        }));

        return NextResponse.json(transformedSubs, { status: 200 });
    } catch (err) {
        console.error("Error fetching reports:", err);
        return NextResponse.json(
            { error: "Failed to fetch reports" },
            { status: 500 }
        );
    }
}
