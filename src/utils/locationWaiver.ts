import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { contractTemplates, locationState, memberContracts, memberLocations } from "@/subtrees/schemas";
import { CheckoutError } from "./getCheckoutContext";

type WaiverTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function getLocationWaiverTemplate(client: WaiverTx | typeof db, lid: string, waiverId?: string | null) {
    if (!waiverId) return null;
    const template = await client.query.contractTemplates.findFirst({
        where: and(eq(contractTemplates.id, waiverId), eq(contractTemplates.locationId, lid)),
    });
    if (!template || template.type !== "waiver" || template.isDraft || !template.content?.trim() || !template.title.trim()) {
        throw new CheckoutError(400, "The location's default waiver must be published and have a title and content. Contact the location to update it.");
    }
    return template;
}

export async function ensureCurrentLocationWaiver(tx: WaiverTx, input: {
    mid: string;
    lid: string;
    memberPlanId: string;
}) {
    const { mid, lid, memberPlanId } = input;
    // Shared location lock allows different members to enroll concurrently.
    // Template writes/assignment take this lock exclusively before template locks.
    const [state] = await tx.select({ waiverId: locationState.waiverId }).from(locationState)
        .where(eq(locationState.locationId, lid)).for("share");
    if (!state) throw new CheckoutError(404, "Location not found");
    const scope = and(eq(memberLocations.memberId, mid), eq(memberLocations.locationId, lid));
    const [memberLocation] = await tx.select({ signedWaiverId: memberLocations.signedWaiverId })
        .from(memberLocations).where(scope).for("update");
    if (!memberLocation) throw new CheckoutError(404, "Member location not found");
    const template = await getLocationWaiverTemplate(tx, lid, state.waiverId);
    if (!template) return { waiverId: null, pendingDocId: null };

    const documents = await tx.select().from(memberContracts).where(and(
        eq(memberContracts.memberId, mid),
        eq(memberContracts.locationId, lid),
        eq(memberContracts.templateId, template.id),
    )).orderBy(asc(memberContracts.created), asc(memberContracts.id)).for("update");
    const accepted = documents.find((doc) => doc.signedOn && (!template.requireSignature || doc.signature?.trim()));
    if (accepted) {
        if (memberLocation.signedWaiverId !== accepted.id) {
            await tx.update(memberLocations).set({ signedWaiverId: accepted.id, updated: new Date() }).where(scope);
        }
        return { waiverId: template.id, pendingDocId: null };
    }
    if (documents.some((doc) => doc.signedOn)) {
        throw new CheckoutError(400, "An existing waiver acceptance is missing its required signature. Contact the location to resolve this document.");
    }
    const pending = documents.find((doc) => !doc.signedOn);
    if (pending) return { waiverId: template.id, pendingDocId: pending.id };
    const [created] = await tx.insert(memberContracts).values({
        memberId: mid,
        locationId: lid,
        templateId: template.id,
        memberPlanId,
    }).returning({ id: memberContracts.id });
    if (!created) throw new Error("Failed to create location waiver document");
    return { waiverId: template.id, pendingDocId: created.id };
}
