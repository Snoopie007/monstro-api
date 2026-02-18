import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { locations, locationState, wallets } from "@subtrees/schemas";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { DEFAULT_LOCATION_SETTINGS } from "@/libs/data";

export async function POST(req: Request) {
  const data = await req.json();

  try {
    const location = await db.transaction(async (tx) => {
      const [location] = await tx
        .insert(locations)
        .values({
          ...data,
          phone: parsePhoneNumberFromString(data.phone)?.number,
          slug: data.name.toLowerCase().replace(/ /g, ""),
        })
        .returning({ id: locations.id, name: locations.name });

      await tx.insert(locationState).values({
        locationId: location.id,
        settings: DEFAULT_LOCATION_SETTINGS,
      });

      await tx.insert(wallets)
        .values({ locationId: location.id })
        .onConflictDoNothing({ target: [wallets.locationId] });

      return { ...location, status: "incomplete" };
    });

    return NextResponse.json({ ...location }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
