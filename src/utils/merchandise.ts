import { and, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { locations, staffsLocations } from "@subtrees/schemas";

type LocationAccessResult = {
	allowed: boolean;
};
type LocationAccessReader = Pick<typeof db, "query">;

export async function canAccessLocation(
	lid: string,
	vendorId?: string,
	staffId?: string,
	database: LocationAccessReader = db
): Promise<LocationAccessResult> {
	if (!vendorId && !staffId) {
		return { allowed: false };
	}

	if (vendorId) {
		const location = await database.query.locations.findFirst({
			where: and(eq(locations.id, lid), eq(locations.vendorId, vendorId)),
			columns: { id: true },
		});

		if (location) return { allowed: true };
	}

	if (staffId) {
		const staffLocation = await database.query.staffsLocations.findFirst({
			where: and(
				eq(staffsLocations.staffId, staffId),
				eq(staffsLocations.locationId, lid),
				eq(staffsLocations.status, "active")
			),
			columns: { locationId: true },
		});

		if (staffLocation) return { allowed: true };
	}

	return { allowed: false };
}

export function slugify(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}
