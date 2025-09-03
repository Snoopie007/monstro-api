import { Elysia } from "elysia";
import { db } from "@/db/db";
import { interpolate } from "@/libs/utils";
import { errorPageTemplate, documentPageTemplate } from "@/libs/html";
import type { MemberPackage, MemberSubscription } from "@/types";

async function getMemberPlan(pid: string) {
	if (!pid) return undefined;

	try {
		let plan: MemberSubscription | MemberPackage | undefined = undefined;

		if (pid.startsWith("sub")) {
			plan = await db.query.memberSubscriptions.findFirst({
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
			plan = await db.query.memberPackages.findFirst({
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

		return plan;
	} catch (error) {
		console.error("Error fetching member plan:", error);
		return undefined;
	}
}

export const planRoutes = new Elysia({ prefix: "/plan" }).get("/:pid/doc", async ({ params: { pid }, set }) => {
	const memberPlan = await getMemberPlan(pid);

	if (!memberPlan) {
		set.status = 404;
		set.headers["Content-Type"] = "text/html; charset=utf-8";
		return errorPageTemplate("Plan Not Found", "Plan not found");
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
	const html = documentPageTemplate(
		plan?.contract?.title || "Document",
		interpolatedContent
	);

	set.headers["Content-Type"] = "text/html; charset=utf-8";

	return html;
});
