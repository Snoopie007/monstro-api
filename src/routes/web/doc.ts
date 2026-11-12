import { Elysia, t } from "elysia";
import { WebAuthMiddleware } from "@/middlewares/WebAuthMW";
import { db } from "@/db/db";
import { MemberDocumentError, getDoc, signDoc } from "@/routes/shared/docs";

function requireMemberSession(input: {
    lid?: string | null;
    session?: { user?: { memberId?: string | null } | null } | null;
    status: (code: number, body: unknown) => unknown;
}) {
    const { lid, session, status } = input;
    if (!lid) {
        return { error: status(401, { message: "No Location ID provided" }) as unknown };
    }
    if (!session) {
        return { error: status(401, { message: "No session provided" }) as unknown };
    }
    const mid = session.user?.memberId;
    if (!mid) {
        return { error: status(401, { message: "No member provided" }) as unknown };
    }
    return { mid, lid };
}

export const webDocRoutes = new Elysia({ prefix: "/docs" })
    .use(WebAuthMiddleware)
    .get("/", async ({ lid, session, status }) => {
        const auth = requireMemberSession({ lid, session, status });
        if ("error" in auth) return auth.error;

        try {
            const docs = await db.query.memberContracts.findMany({
                where: (m, { eq, and }) => and(
                    eq(m.memberId, auth.mid),
                    eq(m.locationId, auth.lid),
                ),
                with: {
                    contractTemplate: {
                        columns: {
                            id: true,
                            locationId: true,
                            title: true,
                            description: true,
                            requireSignature: true,
                            type: true,
                            created: true,
                            updated: true,
                        },
                    }
                },
            });




            return status(200, docs);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch contracts" });
        }
    })
    .get("/:docId", async ({ lid, status, session, params }) => {
        const auth = requireMemberSession({ lid, session, status });
        if ("error" in auth) return auth.error;
        try {
            return status(200, await getDoc(params.docId));
        } catch (error) {
            if (error instanceof MemberDocumentError) {
                return status(error.status, { error: error.message });
            }
            console.error(error);
            return status(500, { error: "Failed to fetch contract" });
        }
    }, {
        params: t.Object({
            docId: t.String(),
        }),
    })
    .patch("/:docId", async ({ body, status, params, session, lid }) => {
        const auth = requireMemberSession({ lid, session, status });
        if ("error" in auth) return auth.error;
        try {
            await signDoc({
                docId: params.docId,
                signature: body.signature,
                userAgent: body.userAgent,
                ipAddress: body.ipAddress,
            });
            return status(200, { message: "Contract signed successfully" });
        } catch (error) {
            if (error instanceof MemberDocumentError) {
                return status(error.status, { message: error.message });
            }
            console.error(error);
            return status(500, { error: "Failed to sign contract" });
        }
    }, {
        params: t.Object({
            docId: t.String(),
        }),
        body: t.Object({
            userAgent: t.Optional(t.Nullable(t.String())),
            ipAddress: t.Optional(t.Nullable(t.String())),
            signature: t.Optional(t.Nullable(t.String())),
        }),
    });
