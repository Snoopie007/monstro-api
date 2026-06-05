import { db } from "@/db/db";
import { createGroupPostFromFormData } from "@/utils/groupPostCreation";
import { canAccessLocation } from "@/utils/merchandise";
import { groups } from "@subtrees/schemas";
import { eq } from "drizzle-orm";
import { Elysia, type Context } from "elysia";


export const xGroups = new Elysia({ prefix: "/groups" })
    .get("/", async (ctx) => {
        const { params, set } = ctx;
        const { lid } = params as { lid: string };

        try {
            const locationGroups = await db.query.groups.findMany({
                where: eq(groups.locationId, lid),
                columns: {
                    id: true,
                    name: true,
                    description: true,
                    type: true,
                    handle: true,
                    coverImage: true,
                },
            });

            return locationGroups;
        } catch (error) {
            console.error("Error fetching groups:", error);
            set.status = 500;
            return {
                success: false,
                error: `Failed to fetch groups: ${error instanceof Error ? error.message : "Unknown error"}`,
            };
        }
    })
    .post("/post", async ({ request, params, status, ...ctx }) => {
        const { lid } = params as { lid: string };
        const { vendorId, staffId, userId } = ctx as Context & {
            vendorId?: string;
            staffId?: string;
            userId?: string;
        };

        if (!userId) {
            return status(401, { message: "Unauthorized", code: "UNAUTHORIZED" });
        }

        try {
            const locationAccess = await canAccessLocation(lid, vendorId, staffId);
            if (!locationAccess.allowed) {
                return status(403, { error: "Forbidden", code: "FORBIDDEN" });
            }

            const formData = await request.formData();
            const result = await createGroupPostFromFormData({ formData, authorId: userId, locationId: lid });
            return status(result.status, result.body);
        } catch (error: any) {
            console.error("Error creating vendor group post:", error);
            return status(500, { error: error?.message || "Internal Server Error" });
        }
    }, {
        parse: "none",
    });

