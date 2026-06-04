import { Elysia } from "elysia";
import { db } from "@/db/db";
import { interpolate } from "@/utils";
import { DocumentPageTemplate, NotFoundPageTemplate } from "@/libs/html";
import { z } from "zod";

const DocsProps = {
	params: z.object({
		did: z.string(),
		type: z.enum(["contract", "waiver"]),
	}),
	query: z.object({
		mid: z.string(),
		theme: z.string().optional(),
	}),
};



export const publicDocsRoutes = new Elysia({ prefix: "/docs" })
	.get("/:did/:type", async ({ params, set, query }) => {
		const { did, type } = params;
		const { theme, mid } = query;


		try {

			const memberContract = await db.query.memberContracts.findFirst({
				where: (mc, { eq }) => eq(mc.id, did),
				with: {
					location: true,
					pricing: {
						columns: {
							id: true,
							name: true,
							price: true,
							interval: true,
							intervalThreshold: true,
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
					contractTemplate: {
						columns: {
							id: true,
							title: true,
							content: true,
						},
					},
				},
			})

			const member = await db.query.members.findFirst({
				where: (member, { eq }) => eq(member.id, mid!),
			});
			if (!memberContract || !member) {
				set.status = 404;
				set.headers["Content-Type"] = "text/html; charset=utf-8";
				return NotFoundPageTemplate(theme);
			}

			const { contractTemplate, location, pricing } = memberContract;



			let variables: Record<string, any> = {
				location: location,
				member: {
					...member,
					name: member.firstName + " " + member.lastName,
				},
			};

			if (type === "contract" && pricing) {
				const { plan, ...rest } = pricing;
				variables["plan"] = {
					name: plan.name,
					price: rest.price,
					interval: `${rest.interval} ${rest.intervalThreshold}`,
					pricingName: rest.name,
				};
			}

			const interpolatedContent = interpolate(
				contractTemplate?.content || "",
				variables
			);

			// Return HTML similar to the original Next.js page
			const html = DocumentPageTemplate(
				contractTemplate?.title || (type === "contract" ? "Contract" : "Waiver"),
				interpolatedContent,
				theme
			);

			set.headers["Content-Type"] = "text/html; charset=utf-8";

			return html;
		} catch (error) {
			console.error("Error fetching member plan:", error);
			return undefined;
		}

	}, DocsProps);
