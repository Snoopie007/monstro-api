import { db } from "@/db/db";
import {
	contractTemplates,
	memberContracts,
} from "subtrees/schemas";
import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia"
import { generatePDF } from "@/utils/generatePDF";
import { renderContractContent } from "@/utils/contractUtils";


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
						with: {
							location: {
								columns: {
									id: true,
								},
							},
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
									locationId: true,
								},
							},
						},
					},
				},
			});

			const scopedMemberDocs = memberDocs.flatMap((doc) => {
				if (
					doc.contractTemplate?.location?.id !== lid ||
					(doc.pricing && doc.pricing.plan?.locationId !== lid)
				) {
					return [];
				}
				if (!doc.contractTemplate) return [];

				const { contractTemplate, ...rest } = doc;
				const { location: _location, ...publicContractTemplate } = contractTemplate;
				const publicPricing = doc.pricing
					? {
						...doc.pricing,
						plan: doc.pricing.plan
							? (({ locationId: _locationId, ...plan }) => plan)(doc.pricing.plan)
							: doc.pricing.plan,
					}
					: doc.pricing;
				return [{
					...rest,
					contractTemplate: publicContractTemplate,
					pricing: publicPricing,
				}];
			});

			return status(200, scopedMemberDocs);
		} catch (err) {
			console.log(err);
			return status(500, { error: err });
		}
	}, {
		params: t.Object({
			mid: t.String(),
			lid: t.String(),
		}),
	})

	app.get("/docs/:did", async ({ params, status }) => {
		const { did, mid, lid } = params;
		try {
			const memberContract = await db.query.memberContracts.findFirst({
				where: (mc, { eq, and }) => and(
					eq(mc.id, did),
					eq(mc.memberId, mid),
					eq(mc.locationId, lid),
				),
				with: {
					contractTemplate: {
						columns: {
							id: true,
							title: true,
							content: true,
						},
					},
					location: true,
					member: true,
					pricing: {
						with: {
							plan: true,
						},
					},
				},
			});
			if (!memberContract) {
				return status(404, { error: "Member contract not found" });
			}
			const contractTemplateLocation = await db.query.contractTemplates.findFirst({
				where: (template, { eq }) => eq(template.id, memberContract.templateId),
				columns: { locationId: true },
			});
			if (!contractTemplateLocation || contractTemplateLocation.locationId !== lid) {
				return status(404, { error: "Member contract not found" });
			}
			if (memberContract.pricing && memberContract.pricing.plan?.locationId !== lid) {
				return status(404, { error: "Member contract not found" });
			}
			const { contractTemplate, pricing } = memberContract;
			const content = renderContractContent(contractTemplate.content, {
				location: memberContract.location,
				member: memberContract.member,
				pricing,
			});
			return status(200, { ...memberContract, mdx: content });
		}
		catch (err) {
			console.log(err);
			return status(500, { error: err });
		}
	}, {
		params: t.Object({
			mid: t.String(),
			lid: t.String(),
			did: t.String(),
		}),
	})

	app.patch("/docs/:did", async ({ params, status, body }) => {
		const { mid, lid, did } = params;
		const { signature } = body;

		try {
			const memberContract = await db.query.memberContracts.findFirst({
				where: (mc, { eq, and }) => and(
					eq(mc.id, did),
					eq(mc.memberId, mid),
					eq(mc.locationId, lid),
				),
				with: {
					contractTemplate: true,
					location: true,
					pricing: {
						with: {
							plan: true,
						},
					},
				},
			});
			if (!memberContract) {
				return status(404, { error: "Member contract not found" });
			}
			const contractTemplateLocation = await db.query.contractTemplates.findFirst({
				where: (template, { eq }) => eq(template.id, memberContract.templateId),
				columns: { locationId: true },
			});
			if (!contractTemplateLocation || contractTemplateLocation.locationId !== lid) {
				return status(404, { error: "Member contract not found" });
			}
			if (memberContract.pricing && memberContract.pricing.plan?.locationId !== lid) {
				return status(404, { error: "Member contract not found" });
			}

			const member = await db.query.members.findFirst({
				where: (m, { eq }) => eq(m.id, mid),
			});
			if (!member) {
				return status(404, { error: "Member not found" });
			}
			const { contractTemplate, pricing } = memberContract;

			await db.update(memberContracts).set({
				signature: signature || null,
				signedOn: new Date(),
			}).where(and(
				eq(memberContracts.id, did),
				eq(memberContracts.memberId, mid),
				eq(memberContracts.locationId, lid),
			));

			setTimeout(() => {
				const content = renderContractContent(contractTemplate.content, {
					location: memberContract.location,
					member,
					pricing,
				});

				generatePDF({
					did,
					mid,
					lid: memberContract.locationId,
					title: contractTemplate.title,
					content,
				});
			}, 1000);

			return status(200, { success: true });
		} catch (err) {
			console.error("Subscription contract processing error:", err);
			return status(500, { error: err });
		}
	}, {
		params: t.Object({
			mid: t.String(),
			lid: t.String(),
			did: t.String(),
		}),
		body: t.Object({
			signature: t.Optional(t.String()),
		}),
	})
	return app;
}
