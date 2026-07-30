import { beforeEach, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";

let paidInput: Record<string, unknown> | undefined;
let freeInput: Record<string, unknown> | undefined;
const handlePaidEventRegistration = mock(async (props: Record<string, unknown>) => {
    paidInput = props;
    return { id: "registration-1" };
});
const handleFreeEventRegistration = mock(async (props: Record<string, unknown>) => {
    freeInput = props;
    return { id: "registration-1" };
});

mock.module("@/handlers/event", () => ({
    handlePaidEventRegistration,
    handleFreeEventRegistration,
    mapEventRegistrationError: () => ({ error: "failed" }),
}));

const { locationEventRoutes } = await import("./events");
const app = await locationEventRoutes(new Elysia({ prefix: "/:lid" }) as never);

beforeEach(() => {
    paidInput = undefined;
    freeInput = undefined;
    handlePaidEventRegistration.mockClear();
    handleFreeEventRegistration.mockClear();
});

test("accepts the legacy mobile paid registration body", async () => {
    const response = await app.handle(new Request("http://localhost/location-1/events/event-1/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            mid: "member-1",
            ticketId: "ticket-1",
            type: "fixed",
            paymentMethodId: "payment-method-1",
            paymentType: "card",
        }),
    }));

    expect(response.status).toBe(201);
    expect(paidInput).toEqual({
        lid: "location-1",
        mid: "member-1",
        eventId: "event-1",
        ticketId: "ticket-1",
        paymentMethodId: "payment-method-1",
        paymentType: "card",
        attemptId: expect.any(String),
    });
});

test("accepts the legacy mobile free registration body", async () => {
    const response = await app.handle(new Request("http://localhost/location-1/events/event-1/register/free", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            mid: "member-1",
            ticketId: "ticket-1",
            type: "free",
        }),
    }));

    expect(response.status).toBe(201);
    expect(freeInput).toEqual({
        lid: "location-1",
        mid: "member-1",
        eventId: "event-1",
        ticketId: "ticket-1",
    });
});
