import { Elysia } from "elysia";
import { db } from "@/db/db";
import { interpolate } from "@/libs/utils";
import { errorPageTemplate, waiverPageTemplate } from "@/libs/html";

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

export const memberRoutes = new Elysia({ prefix: "/member" }).group("/:mid", (app) =>
  app.group("/waiver", (waiverApp) =>
    waiverApp.get("/:did", async ({ params: { mid, did }, set }) => {
      const waiver = await fetchWaiver(did);
      const member = await fetchMember(mid);

      if (!waiver || !member) {
        set.status = 404;
        return errorPageTemplate("Waiver Not Found", "Waiver not found");
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
      const html = waiverPageTemplate(
        waiverContract.title || "Waiver",
        interpolatedContent
      );

      set.headers = {
        "Content-Type": "text/html; charset=utf-8",
      };

      return html;
    })
  )
);
