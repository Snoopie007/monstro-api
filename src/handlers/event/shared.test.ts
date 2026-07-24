import { expect, mock, test } from "bun:test";

mock.module("@/db/db", () => ({ db: {} }));

const {
    cancelPendingEventRegistration,
    createEventRegistration,
} = await import("./shared");

test("reserves event capacity as pending before payment settles", async () => {
    let inserted: Record<string, unknown> | undefined;
    const tx = {
        execute: mock(async () => undefined),
        query: { eventRegistrations: { findFirst: mock(async () => undefined) } },
        select: mock(() => ({
            from: mock(() => ({ where: mock(async () => [{ count: 0 }]) })),
        })),
        insert: mock(() => ({
            values: mock((values: Record<string, unknown>) => {
                inserted = values;
                return { returning: mock(async () => [{ id: "registration-1" }]) };
            }),
        })),
        update: mock(() => ({
            set: mock(() => ({
                where: mock(() => ({ returning: mock(async () => [{ id: "ticket-1" }]) })),
            })),
        })),
    };

    await createEventRegistration(tx as never, {
        lid: "location-1",
        mid: "member-1",
        event: { id: "event-1", capacity: 1 } as never,
        ticket: { id: "ticket-1", quantity: 1 } as never,
        transactionId: "transaction-1",
        registrationId: "registration-1",
        status: "pending",
    });

    expect(inserted).toEqual(expect.objectContaining({
        transactionId: "transaction-1",
        status: "pending",
    }));
});

test("cancels a pending reservation and restores its ticket", async () => {
    const updates: Array<Record<string, unknown>> = [];
    const tx = {
        execute: mock(async () => undefined),
        query: {
            eventRegistrations: {
                findFirst: mock(async () => ({
                    id: "registration-1",
                    eventId: "event-1",
                    ticketId: "ticket-1",
                    status: "pending",
                })),
            },
        },
        update: mock(() => ({
            set: mock((values: Record<string, unknown>) => {
                updates.push(values);
                return {
                    where: mock(() => ({
                        returning: mock(async () => [{ ticketId: "ticket-1" }]),
                    })),
                };
            }),
        })),
    };

    await cancelPendingEventRegistration(tx as never, "transaction-1");

    expect(updates[0]).toEqual(expect.objectContaining({ status: "cancelled" }));
    expect(updates).toHaveLength(2);
});
