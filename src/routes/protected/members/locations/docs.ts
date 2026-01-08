import { db } from "@/db/db";
import {
	memberContracts,
	memberLocations,
	memberPackages,
	memberSubscriptions,
} from "@/db/schemas";
import type { Contract } from "@/types";
import S3Bucket from "@/libs/s3";
import { and, eq } from "drizzle-orm";
import { Elysia } from "elysia";
import { generatePDFBuffer } from "@/libs/PDFGenerator";
import { z } from "zod";
import type { MemberPackage, MemberSubscription } from "@/types";

const s3 = new S3Bucket();
const MLDocsProps = {
	params: z.object({
		mid: z.string(),
		lid: z.string(),
	}),

};




export function mlDocsRoutes(app: Elysia) {
	app.get("/docs", async ({ params, status }) => {
		const { mid, lid } = params;
		try {

			const memberContracts = await db.query.memberContracts.findMany({
				where: (c, { eq, and }) => and(eq(c.memberId, mid), eq(c.locationId, lid)),
			});

			const pkgs = await db.query.memberPackages.findMany({
				where: (pkg, { eq, and }) => and(eq(pkg.memberId, mid), eq(pkg.locationId, lid)),
				with: {
					pricing: {
						with: {
							plan: {
								columns: {
									name: true,
									contractId: true,
								},
							},
						},
					},
				},
				columns: {
					id: true,
					memberContractId: true,
				},
			});
			const subs = await db.query.memberSubscriptions.findMany({
				where: (sub, { eq, and }) => and(eq(sub.memberId, mid), eq(sub.locationId, lid)),
				with: {
					pricing: {
						with: {
							plan: {
								columns: {
									name: true,
									contractId: true,
								},
							},
						},
					},
				},
				columns: {
					id: true,
					memberContractId: true,
				},
			});


			const docIds: string[] = [];
			subs.forEach((sub) => {
				if (sub.pricing.plan.contractId) {
					docIds.push(sub.pricing.plan.contractId.toString());
				}
			});

			pkgs.forEach((pkg) => {
				if (pkg.pricing.plan.contractId) {
					docIds.push(pkg.pricing.plan.contractId.toString());
				}
			});


			const documents = await db.query.contractTemplates.findMany({
				where: (ct, { inArray, or, eq }) =>
					or(inArray(ct.id, docIds), eq(ct.type, "waiver")),
			});

			const extendedDocuments: Contract[] = [];

			// Ensure type correctness: only spread contract if found and all required fields are present
			subs.forEach((sub) => {
				const contractId = sub.pricing.plan.contractId;
				if (!contractId) return;
				const contract = documents.find((d) => d.id === contractId);
				if (!contract) return;

				const signedContract = sub.memberContractId
					? memberContracts.find((c) => c.id === sub.memberContractId)
					: undefined;
				extendedDocuments.push({
					...contract,
					...(signedContract && { signedContract }),
					pricingId: sub.pricing.id,
					planName: sub.pricing.plan.name,
					memberPlanId: sub.id,
				});
			});

			pkgs.forEach((pkg) => {
				const contractId = pkg.pricing.plan.contractId;
				if (!contractId) return;
				const contract = documents.find((d) => d.id === contractId);
				if (!contract) return;
				const signedContract = pkg.memberContractId
					? memberContracts.find((c) => c.id === pkg.memberContractId)
					: undefined;
				extendedDocuments.push({
					...contract,
					...(signedContract && { signedContract }),
					pricingId: pkg.pricing?.id,
					planName: pkg.pricing.plan.name,
					memberPlanId: pkg.id,
				});
			});





			return status(200, extendedDocuments);
		} catch (err) {
			console.log(err);
			return status(500, { error: err });
		}
	}, MLDocsProps)
	app.post("/docs", async ({ params, status, body }) => {
		const { lid, mid } = params;
		const { memberPlanId, signature, templateId } = body;

		try {
			let mp: MemberPackage | MemberSubscription | undefined;

			if (memberPlanId.startsWith("pkg")) {
				mp = await db.query.memberPackages.findFirst({
					where: (pkg, { eq }) => eq(pkg.id, memberPlanId),
					with: {
						pricing: {
							with: {
								plan: true,
							},
						},
					},
				});
			} else {
				mp = await db.query.memberSubscriptions.findFirst({
					where: (sub, { eq }) => eq(sub.id, memberPlanId),
					with: {
						pricing: {
							with: {
								plan: true,
							},
						},
					},
				});
			}

			if (!mp) {
				return status(404, { error: "Member plan not found" });
			}

			const { plan } = mp;


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
				plan: plan,
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

			// if (!plan) {
			// await db.update(memberLocations)
			// 	.set({ waiverId: c.id })
			// 	.where(
			// 		and(
			// 			eq(memberLocations.locationId, lid),
			// 			eq(memberLocations.memberId, mid)
			// 		)
			// 	);
			// } else {
			if (memberPlanId.startsWith("pkg")) {
				await db
					.update(memberPackages)
					.set({ memberContractId: c.id })
					.where(eq(memberPackages.id, memberPlanId));
			} else {
				await db
					.update(memberSubscriptions)
					.set({ memberContractId: c.id })
					.where(eq(memberSubscriptions.id, memberPlanId));
			}
			// }

			return status(200, c);
		} catch (err) {
			console.error("Subscription contract processing error:", err);
			return status(500, { error: err });
		}
	}, {
		...MLDocsProps,
		body: z.object({
			memberPlanId: z.string(),
			signature: z.string(),
			templateId: z.string(),
		}),
	})
	return app;
}
