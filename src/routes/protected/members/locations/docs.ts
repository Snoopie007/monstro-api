import { db } from "@/db/db";
import {
	memberContracts,
	memberLocations,
	memberPackages,
	memberSubscriptions,
} from "@/db/schemas";
import type { Contract, Member, MemberPlanPricing } from "@/types";
import S3Bucket from "@/libs/s3";
import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { generatePDFBuffer } from "@/libs/PDFGenerator";

const s3 = new S3Bucket();
const DocsProps = {
	params: t.Object({
		mid: t.String(),
		lid: t.String(),
	})
};

interface GeneratePDFProps {
	memberContractId: string;
	member: Member;
	template: Contract;
	pricing: MemberPlanPricing | undefined;
}

async function generatePDF({ memberContractId, member, template, pricing }: GeneratePDFProps) {
	try {
		console.log("Generating PDF for member contract:", memberContractId);
		const location = template.location;

		const variables: Record<string, any> = {
			location,
			member: {
				...member,
				name: member?.firstName + " " + member?.lastName,
			},
		};
		if (pricing) {
			variables["plan"] = {
				name: pricing?.plan?.name,
				price: pricing?.price,
				interval: `${pricing?.interval} ${pricing?.intervalThreshold}`,
				pricingName: pricing?.name,
			};
		}

		const pdfBuffer = await generatePDFBuffer(template, variables);
		const filename = `${template.title.toLowerCase().replace(/ /g, "-")}-${new Date().getTime()}.pdf`;

		await s3.uploadBuffer(
			pdfBuffer,
			`members/${member.id}/locations/${location?.id}/docs/${filename}`,
			"application/pdf"
		);

		await db.update(memberContracts).set({ pdfFilename: filename })
			.where(eq(memberContracts.id, memberContractId));
	} catch (error) {
		console.error("Background PDF generation failed:", error);
	}

}

export function mlDocsRoutes(app: Elysia) {
	app.get("/docs", async ({ params, status }) => {
		const { mid, lid } = params;
		try {


			const pkgs = await db.query.memberPackages.findMany({
				where: (pkg, { eq, and }) => and(eq(pkg.memberId, mid), eq(pkg.locationId, lid)),
				with: {
					contract: true,
				},
				columns: {
					id: true,
					memberContractId: true,
					memberPlanPricingId: true,
				},
			});
			const subs = await db.query.memberSubscriptions.findMany({
				where: (sub, { eq, and }) => and(eq(sub.memberId, mid), eq(sub.locationId, lid)),
				with: {
					contract: true,
				},
				columns: {
					id: true,
					memberContractId: true,
					memberPlanPricingId: true,
				},
			});

			// Improved: Avoids errors due to missing memberPlanPricingId in the selected columns.
			const pricingIds = new Set([
				...subs
					.map((sub) => sub.memberPlanPricingId)
					.filter((id): id is string => typeof id === "string"),
				...pkgs
					.map((pkg) => pkg.memberPlanPricingId)
					.filter((id): id is string => typeof id === "string"),
			]);

			const pricings = await db.query.memberPlanPricing.findMany({
				where: (p, { inArray }) => inArray(p.id, Array.from(pricingIds)),
				with: {
					plan: {
						columns: {
							id: true,
							contractId: true,
							name: true,
						},
					},
				},
			});

			const docIds: string[] = Array.from(
				new Set(pricings.map((p) => p.plan.contractId)
					.filter((id): id is string => !!id)
					.map((id) => id.toString())
				)
			);

			const documents = await db.query.contractTemplates.findMany({
				where: (ct, { inArray, or, eq, and, not }) =>
					or(
						and(inArray(ct.id, docIds), eq(ct.isDraft, false)),
						and(eq(ct.type, "waiver"), eq(ct.isDraft, false))
					),
				columns: {
					id: true,
					title: true,
					type: true,
				},
			});

			const extendedDocuments: Partial<Contract>[] = [];

			// Ensure type correctness: only spread contract if found and all required fields are present
			subs.forEach((sub) => {

				const pricing = pricings.find((p) => p.id === sub.memberPlanPricingId);
				const contractId = pricing?.plan.contractId;
				if (!contractId) return;
				const contract = documents.find((d) => d.id === contractId);
				if (!contract) return;

				extendedDocuments.push({
					...contract,
					signedOn: sub.contract ? sub.contract.created : undefined,
					pricingId: sub.memberPlanPricingId,
					planName: pricing?.plan?.name,
					memberPlanId: sub.id,
				});
			});

			pkgs.forEach((pkg) => {
				const pricing = pricings.find((p) => p.id === pkg.memberPlanPricingId);
				const contractId = pricing?.plan.contractId;
				if (!contractId) return;
				const contract = documents.find((d) => d.id === contractId);
				if (!contract) return;
				extendedDocuments.push({
					...contract,
					signedOn: pkg.contract ? pkg.contract.created : undefined,
					pricingId: pkg.memberPlanPricingId,
					planName: pricing?.plan?.name,
					memberPlanId: pkg.id,
				});
			});

			return status(200, extendedDocuments);
		} catch (err) {
			console.log(err);
			return status(500, { error: err });
		}
	}, DocsProps)
	app.post("/docs", async ({ params, status, body }) => {
		const { lid, mid } = params;
		const { priceId, memberPlanId, signature, templateId } = body;

		try {

			const member = await db.query.members.findFirst({
				where: (m, { eq }) => eq(m.id, mid),
			});
			if (!member) {
				return status(404, { error: "Member not found" });
			}

			let pricing: MemberPlanPricing | undefined;
			if (priceId) {
				pricing = await db.query.memberPlanPricing.findFirst({
					where: (p, { eq }) => eq(p.id, priceId),
					with: {
						plan: true,
					},
				});
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


			const [c] = await db.insert(memberContracts).values({
				signature,
				templateId,
				memberId: mid,
				locationId: lid,
			}).returning({ id: memberContracts.id });

			if (!c) {
				return status(500, { error: "Failed to create contract" });
			}

			setTimeout(() => {
				generatePDF({
					memberContractId: c.id,
					template,
					member: member,
					pricing: pricing,
				});
			}, 1000);

			if (!memberPlanId) {
				await db.update(memberLocations).set({ waiverId: c.id }).where(
					and(
						eq(memberLocations.locationId, lid),
						eq(memberLocations.memberId, mid)
					)
				);
			} else {

				if (memberPlanId?.startsWith("pkg")) {
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
			}

			return status(200, c);
		} catch (err) {
			console.error("Subscription contract processing error:", err);
			return status(500, { error: err });
		}
	}, {
		...DocsProps,
		body: t.Object({
			memberPlanId: t.Optional(t.String()),
			priceId: t.Optional(t.String()),
			signature: t.Optional(t.String()),
			templateId: t.String(),
		}),
	})
	return app;
}
