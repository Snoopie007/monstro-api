import { db } from "@/db/db";
import { staffsLocations } from "@/subtrees/schemas";
import { and, eq } from "drizzle-orm";

type VendorNotificationUser = {
    id: string;
    email: string;
};

function addVendorNotificationUser(
    users: Map<string, VendorNotificationUser>,
    user?: { id?: string | null; email?: string | null } | null
) {
    if (!user?.id || !user.email) {
        return;
    }

    users.set(user.id, {
        id: user.id,
        email: user.email,
    });
}

/** The location's owner and its active staff, once each: the vendor portal users who get its notifications. */
export async function fetchVendorNotificationUsers(
    locationId: string,
    vendorUser?: { id?: string | null; email?: string | null } | null
) {
    const users = new Map<string, VendorNotificationUser>();
    addVendorNotificationUser(users, vendorUser);

    const staffMembers = await db.query.staffsLocations.findMany({
        where: and(
            eq(staffsLocations.locationId, locationId),
            eq(staffsLocations.status, "active")
        ),
        with: {
            staff: {
                with: {
                    user: true,
                },
            },
        },
    });

    staffMembers.forEach((staffMember) => {
        addVendorNotificationUser(users, staffMember.staff.user);
    });

    return Array.from(users.values());
}
