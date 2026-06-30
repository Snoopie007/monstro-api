import { db } from "@/db/db";
import {
    createEventRegistration,
    EventRegistrationError,
    loadEventRegistrationContext,
    type LoadEventContextParams,
} from "./shared";



export async function handleFreeEventRegistration({
    lid,
    mid,
    eventId,
    ticketId,
}: LoadEventContextParams) {
    const { event, ticket } = await loadEventRegistrationContext({ lid, mid, eventId, ticketId });

    if (ticket.pricingMethod !== "free" || ticket.price > 0) {
        throw new EventRegistrationError(400, "This ticket requires payment");
    }

    return db.transaction(async (tx) => createEventRegistration(tx, {
        lid,
        mid,
        event,
        ticket,
    }));
}
