import { db } from "@/db/db";

export async function handlePromo(lid: string, code: string) {
    return db.query.promos.findFirst({
        where: (p, { eq, and }) => and(
            eq(p.locationId, lid),
            eq(p.code, code),
            eq(p.isActive, true),
        ),
        columns: {
            created: false,
            updated: false,
        },
    });
}
