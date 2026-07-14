import { db } from "@/db/db";
import { Elysia, t } from "elysia"
import { renderContractContent } from "@/utils/contractUtils";


export function mlCoursesRoutes(app: Elysia) {
    app.get("/docs", async ({ params, status }) => {
        const { mid, lid } = params;
        try {





            return status(200, {});
        } catch (err) {
            console.log(err);
            return status(500, { error: err });
        }
    }, {
        params: t.Object({
            mid: t.String(),
            lid: t.String(),
        }),
    })


    return app;
}
