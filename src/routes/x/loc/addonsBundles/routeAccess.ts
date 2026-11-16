import { hasLocationPermissions, type LocationPermission } from "@/utils/locationAccess";
import type { Context } from "elysia";

type LocationRouteContext = {
	params: Record<string, string | undefined>;
	status: Context["status"];
};

/** Add-on and bundle routes are mounted under /loc/:lid. */
export function getLocationAccess({ params }: Pick<LocationRouteContext, "params">) {
	if (!params.lid) throw new Error("Add-on and bundle routes must be mounted under /loc/:lid");

	return { locationId: params.lid };
}

/** A beforeHandle hook that needs every permission at the route's location.
 * AuthXMiddleware resolves the caller before these routes run. */
function requirePermissions(...required: LocationPermission[]) {
	return async (ctx: LocationRouteContext) => {
		if (!await hasLocationPermissions(ctx.params.lid!, ctx, required)) return ctx.status(403, { error: "Forbidden", code: "FORBIDDEN" });
	};
}

// The catalog follows promos. Member billing follows the subscription routes.
export const viewPlans = requirePermissions("view plans");
export const managePlans = requirePermissions("manage plans");
export const viewBilling = requirePermissions("view billing");
export const sell = requirePermissions("view plans", "manage billing");
export const manageBilling = requirePermissions("manage billing");
