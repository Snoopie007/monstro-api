import { canAccessLocation, canEditLocationMember } from "@/utils/locationAccess";
import type { Context } from "elysia";

// AuthXMiddleware resolves the caller before these routes run.
type LocationRouteContext = {
	params: Record<string, string | undefined>;
	status: Context["status"];
	vendorId?: string;
	staffId?: string;
	userId?: string;
};

/** Add-on and bundle routes are mounted under /loc/:lid. Resolves that location
 * once and rejects callers who cannot manage it. */
export async function getLocationAccess({ params, status, vendorId, staffId, userId }: LocationRouteContext) {
	if (!params.lid) throw new Error("Add-on and bundle routes must be mounted under /loc/:lid");

	const access = await canAccessLocation(params.lid, vendorId, staffId);

	if (!access.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });

	return { locationId: params.lid, billingActor: { vendorId, staffId, userId } };
}

/** Only member billing mutations require the portal's edit-member permission. */
export async function getBillingAccess({ locationId, billingActor, status }: {
  locationId: string;
  billingActor: { vendorId?: string; staffId?: string; userId?: string };
  status: Context["status"];
}) {
  if (!await canEditLocationMember(locationId, billingActor)) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
}
