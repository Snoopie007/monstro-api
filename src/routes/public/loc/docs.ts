import { Elysia } from "elysia";
import { db } from "@/db/db";
import { interpolate } from "@/libs/utils";
import { DocumentPageTemplate, NotFoundPageTemplate } from "@/libs/html";
import { z } from "zod";


const DocsProps = {
	params: z.object({
		did: z.string(),
		type: z.enum(["contract", "waiver"]),
	}),
	query: z.object({
		mid: z.string(),
		pricingId: z.string().optional(),
		theme: z.string().optional(),
	}),
};



export const docsRoutes = new Elysia({ prefix: "/docs" })
	.get("/:did/:type", async ({ params, set, query }) => {
		const { did, type } = params;
		const { theme, mid, pricingId } = query;


		try {

			const ct = await db.query.contractTemplates.findFirst({
				where: (c, { eq, and }) => and(eq(c.id, did), eq(c.type, type)),
				with: {
					location: true,
				},
			});


			const member = await db.query.members.findFirst({
				where: (member, { eq }) => eq(member.id, mid!),
			});

			if (!ct || !member) {
				set.status = 404;
				set.headers["Content-Type"] = "text/html; charset=utf-8";
				return NotFoundPageTemplate(theme);
			}

			let variables: Record<string, any> = {
				location: ct.location,
				member,
			};

			if (type === "contract" && pricingId) {
				const pricing = await db.query.memberPlanPricing.findFirst({
					where: (p, { eq }) => eq(p.id, pricingId!),
					with: {
						plan: true,
					},
				});

				if (pricing) {
					const { plan, ...rest } = pricing;
					variables["plan"] = {
						...plan,
						...rest,
						pricingName: pricing.name,
					};
				}
			}

			const interpolatedContent = interpolate(
				ct?.content || "",
				variables
			);

			// Return HTML similar to the original Next.js page
			const html = DocumentPageTemplate(
				ct?.title || (type === "contract" ? "Contract" : "Waiver"),
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
