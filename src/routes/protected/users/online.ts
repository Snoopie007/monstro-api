import { Elysia, t } from "elysia";

export function userOnlineStatusRoutes(app: Elysia) {
    app.get('/online', async ({ status }) => {
        return status(200, { success: true });
    }, {
        params: t.Object({
            uid: t.String(),
        }),
    });
    return app;
}