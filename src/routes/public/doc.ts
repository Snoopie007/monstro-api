import { Elysia, t } from "elysia";
import { MemberDocumentError, getDoc, signDoc } from "@/routes/shared/docs";

export const publicDocRoutes = new Elysia({ prefix: "/docs" })
    .get("/:docId", async ({ status, params }) => {
        try {
            const doc = await getDoc(params.docId);

            return status(200, doc);
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
    .patch("/:docId", async ({ body, status, params }) => {
        const { signature, userAgent, ipAddress } = body;


        try {
            await signDoc({
                docId: params.docId,
                signature,
                userAgent,
                ipAddress,
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
