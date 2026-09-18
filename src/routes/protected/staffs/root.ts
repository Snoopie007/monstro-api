import { Elysia, t } from "elysia";
import { staffLocationsRoutes } from "./locations/root";
import { db } from "src/db/db";
import { staffs } from "subtrees/schemas/staffs";
import { eq } from "drizzle-orm";

export const staffsRoutes = new Elysia({ prefix: "/staff" })
    .group("/:staffId", (app) => {
        app.use(staffLocationsRoutes);
        app.patch("/setup/completed", async ({ params, status }) => {
            const { staffId } = params;

            try {
                const staff = await db.update(staffs).set({
                    installedStaffApp: true
                }).where(eq(staffs.id, staffId));
                if (!staff) {
                    return status(404, { message: "Staff not found" });
                }
                return status(200, { message: "Setup completed" });
            } catch (error) {
                console.error(error);
                return status(500, { message: "Internal server error" });
            }
        }, {
            params: t.Object({
                staffId: t.String(),
            }),
        });
        return app
    });
