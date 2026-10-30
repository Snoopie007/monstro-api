import { and, eq, inArray } from "drizzle-orm";
import type { Context } from "elysia";
import { db } from "@/db/db";
import { locations, permissions, roleHasPermissions, roles, staffsLocations, userRoles } from "@/subtrees/schemas";

type LocationAccessResult = {
	allowed: boolean;
};
type LocationAccessReader = Pick<typeof db, "query">;

export async function canAccessLocation(
	lid: string,
	vendorId?: string,
	staffId?: string,
	database: LocationAccessReader = db,
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
				eq(staffsLocations.status, "active"),
			),
			columns: { locationId: true },
		});

		if (staffLocation) return { allowed: true };
	}

	return { allowed: false };
}

export type LocationArea =
    | "members" | "schedule" | "messaging" | "store" | "staff" | "programs"
    | "events" | "documents" | "gamification" | "marketing" | "location settings";

export type LocationPermission =
    | `view ${LocationArea | "plans" | "billing" | "reports"}`
    | `manage ${LocationArea | "plans" | "billing"}`;

/** `manage X` includes `view X`. */
function grantsFor(name: LocationPermission): string[] {
    return name.startsWith("view ") ? [name, name.replace("view ", "manage ")] : [name];
}

type LocationActor = { vendorId?: string; staffId?: string; userId?: string };

async function isLocationOwner(lid: string, vendorId?: string): Promise<boolean> {
    if (!vendorId) return false;
    const owned = await db.query.locations.findFirst({
        where: and(eq(locations.id, lid), eq(locations.vendorId, vendorId)),
        columns: { id: true },
    });
    return Boolean(owned);
}

/**
 * Owners pass. Staff need every permission through a role at the location; manage implies view.
 * `ctx` is the request context, which AuthXMiddleware fills with the caller's ids.
 */
export async function hasLocationPermissions(lid: string, ctx: object, required: LocationPermission[]): Promise<boolean> {
    const actor = ctx as LocationActor;
    if (!(await canAccessLocation(lid, actor.vendorId, actor.staffId)).allowed) return false;
    if (await isLocationOwner(lid, actor.vendorId)) return true;
    if (!actor.userId) return false;
    const rows = await db.selectDistinct({ name: permissions.name })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .innerJoin(roleHasPermissions, eq(roleHasPermissions.roleId, roles.id))
        .innerJoin(permissions, eq(permissions.id, roleHasPermissions.permissionId))
        .where(and(eq(userRoles.userId, actor.userId), eq(roles.locationId, lid), inArray(permissions.name, required.flatMap(grantsFor))));
    const granted = new Set(rows.map((row) => row.name));
    return required.every((name) => grantsFor(name).some((grant) => granted.has(grant)));
}

type GuardContext = Context & LocationActor;

const forbidden = (ctx: Context) => ctx.status(403, { error: "Forbidden", code: "FORBIDDEN" });
const isRead = (request: Request) => request.method === "GET" || request.method === "HEAD";

/** Elysia guard: reads need `view <area>`, everything else needs `manage <area>`. */
export function areaGuard(area: LocationArea, isViewRequest = isRead) {
    return {
        async beforeHandle(ctx: GuardContext) {
            const { lid } = ctx.params as { lid: string };
            const level = isViewRequest(ctx.request) ? "view" : "manage";
            if (!await hasLocationPermissions(lid, ctx, [`${level} ${area}`])) return forbidden(ctx);
        },
    };
}

/** Elysia guard: only the location's owner. */
export const ownerGuard = {
    async beforeHandle(ctx: GuardContext) {
        const { lid } = ctx.params as { lid: string };
        if (!await isLocationOwner(lid, ctx.vendorId)) return forbidden(ctx);
    },
};
