import { Elysia } from "elysia";
import { db } from "@/db/db";
import { interpolate } from "@/libs/utils";
import { DocumentPageTemplate, NotFoundPageTemplate } from "@/libs/html";
import type { MemberPackage, MemberSubscription } from "@/types";
import { z } from "zod";

async function getMemberPlan(pid: string) {
	if (!pid) return undefined;

	try {
		let mp: MemberSubscription | MemberPackage | undefined = undefined;

		if (pid.startsWith("sub")) {
			mp = await db.query.memberSubscriptions.findFirst({
				where: (memberSubscription, { eq }) => eq(memberSubscription.id, pid),
				with: {
					location: true,
					member: true,
					plan: {
						with: {
							contract: true,
						},
					},
				},
			});
		} else if (pid.startsWith("pkg")) {
			mp = await db.query.memberPackages.findFirst({
				where: (memberPackage, { eq }) => eq(memberPackage.id, pid),
				with: {
					location: true,
					member: true,
					plan: {
						with: {
							contract: true,
						},
					},
				},
			});
		}
		if (!mp) {
			return undefined;
		}

		return mp;
	} catch (error) {
		console.error("Error fetching member plan:", error);
		return undefined;
	}
}

export const planRoutes = new Elysia({ prefix: "/plan" })
	.get("/:pid/doc", async ({ params: { pid }, set, query }) => {
		const memberPlan = await getMemberPlan(pid);
		const { theme } = query;

		if (!memberPlan) {
			set.status = 404;
			set.headers["Content-Type"] = "text/html; charset=utf-8";
			return NotFoundPageTemplate();
		}

		const { plan, location, member } = memberPlan;

		const variables = {
			location,
			member,
			plan,
		};

		const interpolatedContent = interpolate(
			plan?.contract?.content || "",
			variables
		);

		// Return HTML similar to the original Next.js page
		const html = DocumentPageTemplate(
			plan?.contract?.title || "Document",
			interpolatedContent,
			theme
		);

		set.headers["Content-Type"] = "text/html; charset=utf-8";

		return html;
	}, {
		query: z.object({
			theme: z.string().optional(),
		}),
	});
