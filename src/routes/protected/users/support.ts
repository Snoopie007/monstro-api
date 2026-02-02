import { Elysia, t } from "elysia";

export function userSupportRoutes(app: Elysia) {
    app.post('/support/', async ({ body, status, params }) => {
        const { uid } = params;
        const { category, message } = body;
        try {
            return status(200, { success: true });
        } catch (error) {
            console.error(error);
            return status(500, { message: "Internal server error" });
        }
    }, {
        params: t.Object({
            uid: t.String(),
        }),
        body: t.Object({
            category: t.String(),
            message: t.Optional(t.String()),
        }),
    });
    app.post('/support/delete', async ({ body, status, params }) => {
        const { uid } = params;
        const { message } = body;
        try {
            return status(200, { success: true });
        } catch (error) {
            console.error(error);
            return status(500, { message: "Internal server error" });
        }
    }, {
        params: t.Object({
            uid: t.String(),
        }),
        body: t.Object({
            message: t.Optional(t.String()),
        }),
    });
    return app;
}