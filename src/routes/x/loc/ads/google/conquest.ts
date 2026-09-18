import { Elysia, t } from "elysia";

const Params = t.Object({
    lid: t.String(),
    settingsId: t.String(),
});

export const xGoogleAdsConquest = new Elysia({ prefix: "/:settingsId" })
    .guard({ params: Params })
    .post("/conquest", async ({ status }) => {
        // TO-DO
        return status(200, { success: true });
    });
