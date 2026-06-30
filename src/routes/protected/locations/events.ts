import { db } from "@/db/db";
import {
    handleFreeEventRegistration,
    handlePaidEventRegistration,
    mapEventRegistrationError,
} from "@/handlers/event";
import { Elysia, t } from "elysia";

const EventRegisterParams = t.Object({
    lid: t.String(),
    eventId: t.String(),
});

const EventRegisterBody = t.Object({
    mid: t.String(),
    ticketId: t.String(),
});


export async function locationEventRoutes(app: Elysia) {
    app.get("/events", async ({ params, status }) => {

        const today = new Date();
        const { lid } = params;

        try {
            const events = await db.query.locationEvents.findMany({
                where: (locationEvents, { eq, and, gte }) => and(
                    eq(locationEvents.locationId, lid),
                    gte(locationEvents.startsAt, today),
                    eq(locationEvents.status, "published"),
                ),
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
        }),
    })

    app.get('/events/upcoming', async ({ params, status }) => {
        const { lid } = params;
        const today = new Date();
        try {
            const event = await db.query.locationEvents.findFirst({
                where: (locationEvents, { eq }) => eq(locationEvents.locationId, lid),
                orderBy: (locationEvents, { asc }) => asc(locationEvents.startsAt),
            });
            if (!event) return status(404, { error: "Event not found" });
            return status(200, event);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Unable to load event" });
        }
    }, {
        params: t.Object({
            lid: t.String()
        }),
    });
    app.group('/events/:eventId', (app) => {
        app.get('/', async ({ params, status }) => {
            const { eventId } = params;
            try {
                const event = await db.query.locationEvents.findFirst({
                    where: (locationEvents, { eq }) => eq(locationEvents.id, eventId),
                    with: {
                        tickets: true,
                    }
                });
                return status(200, event);
            } catch (error) {
                console.error(error);
                return status(500, { error: "Unable to load event" });
            }
        }, {
            params: t.Object({
                lid: t.String(),
                eventId: t.String(),
            }),
        });
        app.post('/register/free', async ({ params, body, status }) => {
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
        app.post('/register', async ({ params, body, status }) => {
            const { eventId, lid } = params;
            const { mid, ticketId, paymentMethodId, paymentType } = body;

            try {
                const registration = await handlePaidEventRegistration({
                    lid,
                    mid,
                    eventId,
                    ticketId,
                    paymentMethodId,
                    paymentType,
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
            }),
        });
        return app;
    })
    return app;
}
