import { Elysia, t } from "elysia";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/db";
import { chatMembers, chats } from "@subtrees/schemas";
import { slBots } from "./bots/root";
import { slMemberRoutes } from "./members";
import { slProgramRoutes } from "./programs";
import { slMemberPlanRoutes } from "./plans";
import { locationEventRoutes } from "./events";

async function findOrCreateLocationChat(
    locationId: string,
    locationName: string,
    userId: string,
) {
    const existingChats = await db.query.chats.findMany({
        where: and(
            eq(chats.locationId, locationId),
            isNull(chats.groupId),
        ),
        with: {
            chatMembers: {
                columns: { userId: true },
            },
        },
    });

    const existing = existingChats.find((chat) =>
        chat.chatMembers.some((member) => member.userId === userId),
    );
    if (existing) return existing.id;

    const [created] = await db.insert(chats).values({
        startedBy: userId,
        locationId,
        name: locationName,
    }).returning({ id: chats.id });

    if (!created) {
        throw new Error("Failed to create location chat");
    }

    await db.insert(chatMembers).values({
        chatId: created.id,
        userId,
    });

    return created.id;
}

export const staffLocationsRoutes = new Elysia({ prefix: "/locations" })
    .get("/", async ({ params, status }) => {
        const { staffId } = params;
        try {
            const staff = await db.query.staffs.findFirst({
                where: (s, { eq, and }) => and(
                    eq(s.id, staffId),
                ),
                columns: {
                    id: true,
                    userId: true,
                },
                with: {
                    staffLocations: {
                        with: {
                            location: {
                                columns: {
                                    id: true,
                                    name: true,
                                    address: true,
                                    city: true,
                                    state: true,
                                    postalCode: true,
                                },
                                with: {
                                    locationState: {
                                        columns: {
                                            locationId: true,
                                            status: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });

            if (!staff) {
                return status(404, { error: "Staff not found" });
            }

            const locations = await Promise.all(
                staff.staffLocations.map(async (sl) => {
                    const location = sl.location;
                    const chatId = await findOrCreateLocationChat(
                        location.id,
                        location.name,
                        staff.userId,
                    );
                    return { ...location, chatId };
                }),
            );

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
        app.use(slMemberPlanRoutes);
        app.use(slBots);
        app.use(locationEventRoutes);
        return app;
    })
