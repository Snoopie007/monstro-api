import { db } from "@/db/db";
import { Elysia, t } from "elysia";

// Shared column selections
const userColumns = {
    id: true,
    name: true,
    image: true,
};
const memberColumns = {
    id: true,
    firstName: true,
    lastName: true,
};

// Helper to DRY with/columns for members and users
const memberWithUser = {
    columns: memberColumns,
    with: {
        user: {
            columns: userColumns,
        },
    },
};
const userWithMember = {
    columns: userColumns,
    with: {
        member: {
            columns: memberColumns,
        },
    },
};

export const searchRoutes = new Elysia({ prefix: "/search" })
    // Accept search via query param: email, phone, or username
    .get(
        "/members",
        async ({ status, query }) => {
            const { email, phone, username } = query as {
                email?: string;
                phone?: string;
                username?: string;
            };
            try {
                if (username) {
                    // Search users table by username, include member relation
                    const result = await db.query.users.findMany({
                        where: (u, { eq }) => eq(u.username, username),
                        ...userWithMember,
                    });
                    if (!result || result.length === 0)
                        return status(404, { error: "User not found" });
                    return status(200, result);
                } else if (email) {
                    // Search members table by email
                    const result = await db.query.members.findMany({
                        where: (m, { eq }) => eq(m.email, email),
                        ...memberWithUser,
                    });
                    return status(200, result);
                } else if (phone) {
                    // Search members table by phone
                    const result = await db.query.members.findMany({
                        where: (m, { eq }) => eq(m.phone, phone),
                        ...memberWithUser,
                    });
                    return status(200, result);
                }
                return status(400, {
                    error: "Please provide at least one of: email, phone, or username",
                });
            } catch (error) {
                console.error(error);
                return status(500, { error: "Failed to perform search" });
            }
        },
        {
            query: t.Object({
                email: t.Optional(t.String()),
                phone: t.Optional(t.String()),
                username: t.Optional(t.String()),
            }),
        }
    );
