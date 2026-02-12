import { db } from "@/db/db";
import { locationState } from "@subtrees/schemas";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import type { HolidaySettings, LocationSettings } from "@subtrees/types/location";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * PATCH /api/protected/loc/[id]/settings/holidays
 * Updates the holiday settings portion of locationState.settings
 */
export async function PATCH(req: NextRequest, props: Props) {
  const { id } = await props.params;
  const body: HolidaySettings = await req.json();

  try {
    // Fetch current settings
    const state = await db.query.locationState.findFirst({
      where: eq(locationState.locationId, id),
      columns: { settings: true },
    });

    if (!state) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // Merge holidays into existing settings
    const currentSettings = (state.settings ?? {}) as LocationSettings;
    const updatedSettings: LocationSettings = {
      ...currentSettings,
      holidays: body,
    };

    // Update the settings
    const [updated] = await db
      .update(locationState)
      .set({
        settings: updatedSettings,
        updated: new Date(),
      })
      .where(eq(locationState.locationId, id))
      .returning({ settings: locationState.settings });

    return NextResponse.json(updated.settings, { status: 200 });
  } catch (err) {
    console.error(err);
    const error = err instanceof Error ? err.message : "Failed to update holiday settings";
    return NextResponse.json({ error }, { status: 500 });
  }
}



