import { Elysia } from "elysia";
import { db } from "@/db/db";
import { interpolate } from "@/libs/utils";
import { NotFoundPageTemplate, DocumentPageTemplate } from "@/libs/html";

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
    waiverApp.get("/:did", async ({ params: { mid, did }, set, query }) => {
      const waiver = await fetchWaiver(did);
      const member = await fetchMember(mid);
      const { theme } = query;

      if (!waiver || !member) {
        set.status = 404;
        return NotFoundPageTemplate();
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
      const html = DocumentPageTemplate(
        waiverContract.title || "Waiver",
        interpolatedContent,
        theme
      );

      set.headers = {
        "Content-Type": "text/html; charset=utf-8",
      };

      return html;
    })
  )
);
