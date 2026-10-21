import { and, eq, inArray } from "drizzle-orm";
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

/** Subscription and invoice edits use the portal's existing edit-member permission. */
export async function canEditLocationMember(lid: string, actor: { vendorId?: string; staffId?: string; userId?: string }): Promise<boolean> {
    if (!(await canAccessLocation(lid, actor.vendorId, actor.staffId)).allowed) return false;
    if (actor.vendorId) {
        const owned = await db.query.locations.findFirst({
            where: and(eq(locations.id, lid), eq(locations.vendorId, actor.vendorId)),
            columns: { id: true },
        });
        if (owned) return true;
    }
    if (!actor.userId) return false;
    const [permission] = await db.select({ id: permissions.id })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .innerJoin(roleHasPermissions, eq(roleHasPermissions.roleId, roles.id))
        .innerJoin(permissions, eq(permissions.id, roleHasPermissions.permissionId))
        .where(and(eq(userRoles.userId, actor.userId), eq(roles.locationId, lid), eq(permissions.name, "edit member")))
        .limit(1);
    return Boolean(permission);
}

export type FinancialPermission =
    | "view plans" | "manage plans"
    | "view billing" | "manage billing"
    | "view reports";

const IMPLIED_BY: Partial<Record<FinancialPermission, FinancialPermission>> = {
    "view plans": "manage plans",
    "view billing": "manage billing",
};

type LocationActor = { vendorId?: string; staffId?: string; userId?: string };

/**
 * Owners pass. Staff need every permission through a role at the location; manage implies view.
 * `ctx` is the request context, which AuthXMiddleware fills with the caller's ids.
 */
export async function hasLocationPermissions(lid: string, ctx: object, required: FinancialPermission[]): Promise<boolean> {
    const actor = ctx as LocationActor;
    if (!(await canAccessLocation(lid, actor.vendorId, actor.staffId)).allowed) return false;
    if (actor.vendorId) {
        const owned = await db.query.locations.findFirst({
            where: and(eq(locations.id, lid), eq(locations.vendorId, actor.vendorId)),
            columns: { id: true },
        });
        if (owned) return true;
    }
    if (!actor.userId) return false;
    const names = required.flatMap((name) => IMPLIED_BY[name] ? [name, IMPLIED_BY[name]] : [name]);
    const rows = await db.selectDistinct({ name: permissions.name })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .innerJoin(roleHasPermissions, eq(roleHasPermissions.roleId, roles.id))
        .innerJoin(permissions, eq(permissions.id, roleHasPermissions.permissionId))
        .where(and(eq(userRoles.userId, actor.userId), eq(roles.locationId, lid), inArray(permissions.name, names)));
    const granted = new Set(rows.map((row) => row.name));
    return required.every((name) => granted.has(name) || Boolean(IMPLIED_BY[name] && granted.has(IMPLIED_BY[name])));
}
