import { Elysia, t } from "elysia";
import { db } from "@/db/db";
import { slAgentRoutes } from "./agent";
import { slMemberRoutes } from "./members";
import { slProgramRoutes } from "./programs";


export const staffLocationsRoutes = new Elysia({ prefix: "/locations" })
    .get("/", async ({ params, status }) => {

        const { staffId } = params;
        try {
            const staff = await db.query.staffs.findFirst({
                where: (s, { eq, and }) => and(
                    eq(s.id, staffId),
                ),
                with: {
                    staffLocations: {
                        with: {
                            location: {
                                with: {
                                    locationState: true,
                                },
                            },
                        },
                    },
                },
            });
            if (!staff) {
                return status(404, { error: "Staff not found" });
            }
            const locations = staff.staffLocations.map((sl) => sl.location);
            return status(200, locations);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal server error" });
        }
    }, {
        params: t.Object({
            staffId: t.String(),
        }),
    })
    .group("/:lid", (app) => {
        app.use(slMemberRoutes);
        app.use(slProgramRoutes);
        app.use(slAgentRoutes);
        return app;
    })
