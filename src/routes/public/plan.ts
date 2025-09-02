import { Elysia } from "elysia";
import { db } from "@/db/db";
import { interpolate } from "@/libs/utils";
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

export const planRoutes = new Elysia({ prefix: "/plan" })

	.get("/:pid/doc", async ({ params: { pid }, set }) => {
		const memberPlan = await getMemberPlan(pid);

		if (!memberPlan) {
			set.status = 404;
			return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Plan Not Found</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 40px 20px; }
            .error { color: #dc3545; font-size: 24px; }
          </style>
        </head>
        <body>
          <div class="error">Plan not found</div>
        </body>
        </html>
      `;
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
		const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${plan?.contract?.title || "Document"}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #374151;
            margin: 0;
            padding: 20px;
          }
          .header {
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            color: #111827;
            margin: 0;
          }
          .content {
            color: #4b5563;
          }
          .content h1, .content h2, .content h3 {
            color: #111827;
            margin-top: 32px;
            margin-bottom: 16px;
          }
          .content h1 { font-size: 28px; }
          .content h2 { font-size: 24px; }
          .content h3 { font-size: 20px; }
          .content p {
            margin-bottom: 16px;
          }
          .content ul, .content ol {
            margin-bottom: 16px;
            padding-left: 24px;
          }
          .content li {
            margin-bottom: 8px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="title">${plan?.contract?.title || "Document"}</h1>
          </div>
          <div class="content">
            ${interpolatedContent}
          </div>
        </div>
      </body>
      </html>
    `;

		set.headers = {
			"Content-Type": "text/html; charset=utf-8",
		};

		return html;
	});
