import { db } from "@/db/db";
import {
	memberContracts,
	memberLocations,
	memberPackages,
	memberSubscriptions,
} from "subtrees/schemas";
import type { Contract, Member, MemberPlanPricing } from "subtrees/types";
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

type Variables = {
	pricing?: {
		id: string;
		name: string;
		price: number;
		interval: string | null;
		intervalThreshold: number | null;
	};
	plan?: {
		id: string;
		name: string;
	};
}

export function mlDocsRoutes(app: Elysia) {
	app.get("/docs", async ({ params, status }) => {
		const { mid, lid } = params;
		try {


			const memberDocs = await db.query.memberContracts.findMany({
				where: (mc, { eq, and }) => and(eq(mc.memberId, mid), eq(mc.locationId, lid)),
				with: {
					contractTemplate: {
						columns: {
							id: true,
							title: true,
							type: true,
						},
					},
					pricing: {
						columns: {
							id: true,
							name: true,
							price: true,
						},
						with: {
							plan: {
								columns: {
									id: true,
									name: true,
								},
							},
						},
					},
				},
			});



			return status(200, memberDocs);
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
				await db.update(memberLocations).set({ signedWaiverId: c.id }).where(
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
