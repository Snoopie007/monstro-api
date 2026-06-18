import { db } from "@/db/db";
import {
	memberContracts,
} from "subtrees/schemas";
import { eq } from "drizzle-orm";
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
	}, {
		params: t.Object({
			mid: t.String(),
			lid: t.String(),
		}),
	})

	app.get("/docs/:did", async ({ params, status }) => {
		const { did } = params;
		try {
			const memberContract = await db.query.memberContracts.findFirst({
				where: (mc, { eq }) => eq(mc.id, did),
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
		const { mid, did } = params;
		const { signature } = body;

		try {

			const memberContract = await db.query.memberContracts.findFirst({
				where: (mc, { eq }) => eq(mc.id, did),
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
			}).where(eq(memberContracts.id, did));

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
