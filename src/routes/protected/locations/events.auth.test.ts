import { afterAll, beforeEach, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";
import { SignJWT } from "jose";
import { AuthMiddleware } from "@/middlewares/AuthMW";

const previousSecret = process.env.SUPABASE_JWT_SECRET;
const secret = "local-event-registration-auth-test";
process.env.SUPABASE_JWT_SECRET = secret;
const free = mock(async (_input: unknown) => ({ id: "registration" }));
const paid = mock(async (_input: unknown) => ({ id: "registration" }));
const access = mock(async () => ({ allowed: true }));
mock.module("@/utils/merchandise", () => ({ canAccessLocation: access }));
mock.module("@/db/db", () => ({ db: { query: { staffs: { findFirst: async () => ({ userId: "staff-user" }) } } } }));
mock.module("@/handlers/event", () => ({
    handleFreeEventRegistration: free,
    handlePaidEventRegistration: paid,
    mapEventRegistrationError: () => { throw new Error("Unexpected registration error"); },
}));
const memberRoutes = (await import("./events")).locationEventRoutes;
const staffRoutes = (await import("../staffs/locations/events")).locationEventRoutes;
const app = new Elysia().use(AuthMiddleware)
    .group("/locations/:lid", app => app.use(memberRoutes))
    .group("/staff/:staffId/locations/:lid", app => app.use(staffRoutes));
beforeEach(() => { free.mockClear(); paid.mockClear(); access.mockReset(); access.mockResolvedValue({ allowed: true }); });
afterAll(() => {
    if (previousSecret === undefined) delete process.env.SUPABASE_JWT_SECRET;
    else process.env.SUPABASE_JWT_SECRET = previousSecret;
});
async function register(kind: "free" | "paid", options: { target?: string; role?: string; staff?: boolean; actorUserId?: string } = {}) {
    const token = await new SignJWT({ role: options.role ?? "authenticated", user_metadata: { member_id: "member-a" } })
        .setSubject(options.actorUserId ?? (options.staff ? "staff-user" : "user-a")).setProtectedHeader({ alg: "HS256" }).setExpirationTime("5m")
        .sign(new TextEncoder().encode(secret));
    const path = options.staff ? "/staff/staff-a/locations/location/events/event/registrations" : "/locations/location/events/event";
    return app.handle(new Request("http://localhost" + path + "/register" + (kind === "free" ? "/free" : ""), {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Mobile": "true", Authorization: "Bearer " + token },
        body: JSON.stringify({ mid: options.target ?? "member-a", ticketId: "ticket", ...(kind === "paid" ? { paymentMethodId: "method", attemptId: "attempt" } : {}) }),
    }));
}
for (const kind of ["free", "paid"] as const) {
    test(kind + ": a member cannot bypass the guard using the staff route", async () => {
        expect((await register(kind, { staff: true, actorUserId: "user-a", target: "member-b" })).status).toBe(403);
        expect(free).not.toHaveBeenCalled();
        expect(paid).not.toHaveBeenCalled();
    });
    test(kind + ": staff without active location access cannot register", async () => {
        access.mockResolvedValueOnce({ allowed: false });
        expect((await register(kind, { staff: true, target: "member-b" })).status).toBe(403);
        expect(free).not.toHaveBeenCalled();
        expect(paid).not.toHaveBeenCalled();
    });
    test(kind + ": member can register themselves", async () => {
        expect((await register(kind)).status).toBe(201);
        expect(kind === "free" ? free : paid).toHaveBeenCalledTimes(1);
    });
    test(kind + ": another member is rejected before payment or registration", async () => {
        expect((await register(kind, { target: "member-b" })).status).toBe(403);
        expect(free).not.toHaveBeenCalled();
        expect(paid).not.toHaveBeenCalled();
    });
    test(kind + ": trusted service calls retain access", async () => {
        expect((await register(kind, { target: "member-b", role: "service_role" })).status).toBe(201);
    });
    test(kind + ": staff route accepts its parent staffId parameter", async () => {
        expect((await register(kind, { staff: true, target: "member-b" })).status).toBe(201);
        expect(kind === "free" ? free : paid).toHaveBeenCalledWith(expect.objectContaining({
            lid: "location", mid: "member-b", eventId: "event", ticketId: "ticket",
        }));
    });
}
