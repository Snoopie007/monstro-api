import { Elysia, t } from "elysia";
import { MemberDocumentError, getDoc, getDocPdf, signDoc } from "@/routes/shared/docs";

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
    .get("/:docId/pdf", async ({ status, params }) => {
        try {
            const pdf = await getDocPdf(params.docId);
            if (!pdf) return status(404, { error: "This document has no stored PDF" });
            return new Response(pdf, {
                headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${params.docId}.pdf"`, "Cache-Control": "no-store" },
            });
        } catch (error) {
            if (error instanceof MemberDocumentError) {
                return status(error.status, { error: error.message });
            }
            console.error(error);
            return status(500, { error: "Failed to load the document PDF" });
        }
    }, {
        params: t.Object({
            docId: t.String(),
        }),
    })
    .patch("/:docId", async ({ body, status, params }) => {
        const { signature, userAgent, ipAddress, signerName, texts, sha256 } = body;

        try {
            await signDoc({
                docId: params.docId,
                signature,
                userAgent,
                ipAddress,
                signerName,
                texts,
                sha256,
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
            signerName: t.Optional(t.Nullable(t.String({ maxLength: 200 }))),
            texts: t.Optional(t.Nullable(t.Record(t.String(), t.String({ maxLength: 500 })))),
            sha256: t.Optional(t.Nullable(t.String({ pattern: "^[0-9a-f]{64}$" }))),
        }),
    });
