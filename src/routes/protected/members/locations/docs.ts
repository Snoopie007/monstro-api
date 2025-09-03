import { db } from "@/db/db";
import {
	memberContracts,
	memberLocations,
	memberPackages,
	memberSubscriptions,
} from "@/db/schemas";
import S3Bucket from "@/libs/s3";
import { interpolate } from "@/libs/utils";
import type { Contract } from "@/types/contract";
import { and, eq } from "drizzle-orm";
import { Elysia } from "elysia";
import type { MemberPlan } from "@/types";
import { generatePDFBuffer } from "@/libs/PDFGenerator";

const s3 = new S3Bucket();

type Props = {
	memberId: string;
	params: {
		mid: string;
		lid: string;
	};
	status: any;
};

type PostBody = {
	plan: MemberPlan;
	signature: string;
	templateId: string;
};


export function mlDocsRoutes(app: Elysia) {
	return app.get("/docs", async ({ memberId, params, status }: Props) => {
		const { mid, lid } = params;
		try {
			const member = await db.query.members.findFirst({
				where: (m, { eq }) => eq(m.id, mid),
				with: {
					subscriptions: {
						with: {
							plan: true,
						},
					},
					packages: {
						with: {
							plan: true,
						},
					},
					contracts: true,
				},
			});

			if (!member) {
				return status(404, { error: "Member not found" });
			}

			const docIds: string[] = [];
			member.subscriptions.forEach((sub) => {
				if (sub.plan.contractId) {
					docIds.push(sub.plan.contractId);
				}
			});

			member.packages.forEach((pkg) => {
				if (pkg.plan.contractId) {
					docIds.push(pkg.plan.contractId);
				}
			});

			const documents = await db.query.contractTemplates.findMany({
				where: (ct, { inArray, or, eq }) =>
					or(inArray(ct.id, docIds), eq(ct.type, "waiver")),
			});

			const extendedDocuments = documents.map((doc) => {
				const signedDoc = member.contracts.find((c) => c.templateId === doc.id);
				const memberPlan =
					member.subscriptions.find((s) => s.plan.contractId === doc.id) ||
					member.packages.find((p) => p.plan.contractId === doc.id);
				return {
					...doc,
					memberContract: signedDoc,
					memberPlan,
				};
			});

			return status(200, extendedDocuments);
		} catch (err) {
			console.log(err);
			return status(500, { error: err });
		}
	}).post("/docs", async ({ memberId, params, status, body }: Props & { body: PostBody }) => {
		const { lid, mid } = params;
		const { plan, signature, templateId } = body;

		try {
			const member = await db.query.members.findFirst({
				where: (m, { eq }) => eq(m.id, mid),
			});

			if (!member) {
				return status(404, { error: "Member not found" });
			}

			const template = await db.query.contractTemplates.findFirst({
				where: (ct, { eq }) => eq(ct.id, templateId),
				with: {
					location: true,
				},
			});

			if (!template) {
				return status(404, { error: "Template not found" });
			}

			const variables = {
				location: template.location,
				member,
				...(plan ? { plan } : {}),
			};

			const pdfBuffer = await generatePDFBuffer(template, variables);
			const filename = `${template.title
				.toLowerCase()
				.replace(/ /g, "-")}-${new Date().getTime()}.pdf`;

			await s3.uploadBuffer(
				pdfBuffer,
				`members/${mid}/locations/${lid}/docs/${filename}`,
				"application/pdf"
			);

			const [c] = await db
				.insert(memberContracts)
				.values({
					signature,
					templateId,
					pdfFilename: filename,
					memberId: mid,
					locationId: lid,
				})
				.returning();

			if (!c) {
				return status(500, { error: "Failed to create contract" });
			}

			if (!plan) {
				await db
					.update(memberLocations)
					.set({ waiverId: c.id })
					.where(
						and(
							eq(memberLocations.locationId, lid),
							eq(memberLocations.memberId, mid)
						)
					);
			} else {
				if (plan.id.startsWith("pkg")) {
					await db
						.update(memberPackages)
						.set({ memberContractId: c.id })
						.where(eq(memberPackages.id, plan.id));
				} else {
					await db
						.update(memberSubscriptions)
						.set({ memberContractId: c.id })
						.where(eq(memberSubscriptions.id, plan.id));
				}
			}

			return status(200, c);
		} catch (err) {
			console.error("Subscription contract processing error:", err);
			return status(500, { error: err });
		}
	}
	)
}
