import { db } from "@/db/db";
import {
    handleFreeEventRegistration,
    handlePaidEventRegistration,
    mapEventRegistrationError,
} from "@/handlers/event";
import { Elysia, t } from "elysia";
import { randomUUID } from "node:crypto";
import type { AuthContext } from "@/middlewares/AuthMW";
import { canAccessLocation } from "@/utils/merchandise";

// A staff ID in the URL is not proof that the caller owns that staff account.
async function canRegisterAsStaff(actor: AuthContext, staffId: string, locationId: string) {
    if (actor.isServiceRole === true) return true;
    if (!actor.userId) return false;
    const staff = await db.query.staffs.findFirst({
        where: (row, { eq }) => eq(row.id, staffId),
        columns: { userId: true },
    });
    if (!staff || staff.userId !== actor.userId) return false;
    return (await canAccessLocation(locationId, undefined, staffId)).allowed;
}

const EventRegisterParams = t.Object({
    // Included by the parent /staff/:staffId route.
    staffId: t.String(),
    lid: t.String(),
    eventId: t.String(),
});

const EventRegisterBody = t.Object({
    mid: t.String(),
    ticketId: t.String(),
    type: t.Optional(t.Union([
        t.Literal("fixed"),
        t.Literal("free"),
    ])),
});


export async function locationEventRoutes(app: Elysia) {
    app.get("/events", async ({ params, query, status }) => {
        const today = new Date();
        const { lid } = params;
        const { upcomingOnly } = query;
        try {
            const events = await db.query.locationEvents.findMany({
                where: (locationEvents, { eq, and, gte }) => and(
                    eq(locationEvents.locationId, lid),
                    eq(locationEvents.status, "published"),
                ),
                with: {
                    tickets: true,
                },
                orderBy: (locationEvents, { asc }) => asc(locationEvents.startsAt),
            });

            return status(200, events);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Unable to load events" });
        }
    }, {
        params: t.Object({
            lid: t.String(),
            staffId: t.String(),
        }),
    })


    app.group('/events/:eventId/registrations', (app) => {
        app.get('/', async ({ params, status }) => {
            const { eventId } = params;
            try {
                const registrations = await db.query.eventRegistrations.findMany({
                    where: (eventRegistrations, { eq }) => eq(eventRegistrations.eventId, eventId),
                });
                return status(200, registrations);
            } catch (error) {
                console.error(error);
                return status(500, { error: "Unable to load registrations" });
            }
        }, {
            params: t.Object({
                lid: t.String(),
                eventId: t.String(),
                staffId: t.String(),
            }),
        });
        app.post('/register/free', async (context) => {
            const { params, body, status } = context;
            if (!(await canRegisterAsStaff(context as typeof context & AuthContext, params.staffId, params.lid))) {
                return status(403, { error: "Cannot register members at this location" });
            }
            const { eventId, lid } = params;
            const { mid, ticketId } = body;

            try {
                const registration = await handleFreeEventRegistration({
                    lid,
                    mid,
                    eventId,
                    ticketId,
                });
                return status(201, registration);
            } catch (error) {
                return mapEventRegistrationError(status, error);
            }
        }, {
            params: EventRegisterParams,
            body: EventRegisterBody,
        });
        app.post('/register', async (context) => {
            const { params, body, status } = context;
            if (!(await canRegisterAsStaff(context as typeof context & AuthContext, params.staffId, params.lid))) {
                return status(403, { error: "Cannot register members at this location" });
            }
            const { eventId, lid } = params;
            const { mid, ticketId, paymentMethodId, paymentType, attemptId } = body;

            try {
                const registration = await handlePaidEventRegistration({
                    lid,
                    mid,
                    eventId,
                    ticketId,
                    paymentMethodId,
                    paymentType,
                    attemptId: attemptId ?? randomUUID(),
                });
                return status(201, registration);
            } catch (error) {
                return mapEventRegistrationError(status, error);
            }
        }, {
            params: EventRegisterParams,
            body: t.Object({
                ...EventRegisterBody.properties,
                paymentMethodId: t.String(),
                paymentType: t.Optional(t.Union([
                    t.Literal("card"),
                    t.Literal("us_bank_account"),
                ])),
                attemptId: t.Optional(t.String()),
            }),
        });
        return app;
    })
    return app;
}
