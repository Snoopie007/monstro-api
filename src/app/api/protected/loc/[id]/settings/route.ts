import { db } from "@/db/db";
import { locationState } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/protected/loc/[id]/settings
 * Returns the location settings (from locationState.settings)
 */
export async function GET(req: NextRequest, props: Props) {
  const { id } = await props.params;

  try {
    const state = await db.query.locationState.findFirst({
      where: eq(locationState.locationId, id),
      columns: {
        settings: true,
      },
    });

    if (!state) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    return NextResponse.json(state.settings ?? {}, { status: 200 });
  } catch (err) {
    console.error(err);
    const error = err instanceof Error ? err.message : "Failed to fetch settings";
    return NextResponse.json({ error }, { status: 500 });
  }
}


