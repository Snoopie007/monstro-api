import { Elysia } from "elysia";
import { db } from "@/db/db";
import { interpolate } from "@/libs/utils";

async function fetchWaiver(did: string) {
  if (!did) return undefined;

  try {
    const waiver = await db.query.contractTemplates.findFirst({
      where: (t, { eq, and }) => and(eq(t.id, did), eq(t.type, "waiver")),
      with: {
        location: {
          with: {
            locationState: true,
          },
        },
      },
    });
    return waiver;
  } catch (error) {
    console.error("Error fetching waiver:", error);
    return undefined;
  }
}

async function fetchMember(mid: string) {
  if (!mid) return undefined;

  try {
    const member = await db.query.members.findFirst({
      where: (m, { eq }) => eq(m.id, mid),
    });
    return member;
  } catch (error) {
    console.error("Error fetching member:", error);
    return undefined;
  }
}

export const memberRoutes = new Elysia({ prefix: "/member" }).group(
  "/:mid",
  (app) =>
    app.group("/waiver", (waiverApp) =>
      waiverApp.get("/:did", async ({ params: { mid, did }, set }) => {
        const waiver = await fetchWaiver(did);
        const member = await fetchMember(mid);

        if (!waiver || !member) {
          set.status = 404;
          return `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>Waiver Not Found</title>
                            <meta charset="utf-8">
                            <style>
                                body { font-family: Arial, sans-serif; text-align: center; padding: 25px 0px; }
                                .error { color: #dc3545; font-size: 24px; }
                            </style>
                        </head>
                        <body>
                            <div class="error">Waiver not found</div>
                        </body>
                        </html>
                    `;
        }

        const { location, ...waiverContract } = waiver;

        const variables = {
          location,
          member,
        };

        const interpolatedContent = interpolate(
          waiverContract.content || "",
          variables
        );

        // Return HTML similar to the original Next.js page
        const html = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>${waiverContract.title || "Waiver"}</title>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <style>
                            body {
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                line-height: 1.6;
                                color: #374151;
                                margin: 0;
                                padding: 25px 0px;
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
                                <h1 class="title">${waiverContract.title}</h1>
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
      })
    )
);
