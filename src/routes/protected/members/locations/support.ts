import { db } from "@/db/db";
import { Elysia } from "elysia";
import { supportAssistants, supportConversations } from "@/db/schemas/";

type Props = {
  memberId: string;
  params: {
    mid: string;
    lid: string;
    cid: string;
  };
  status: any;
};

type PostBody = {
  assistantId: string;
};

export function mlSupportRoutes(app: Elysia) {
  return app
    .get("/support", async ({ memberId, params, status }: Props) => {
      const { mid, lid } = params;

      try {
        const conversations = await db.query.supportConversations.findMany({
          where: (b, { eq, and }) =>
            and(eq(b.locationId, lid), eq(b.memberId, mid)),
        });

        if (!conversations) {
          return status(404, { error: "No support assistant found" });
        }

        return status(200, conversations);
      } catch (error) {
        console.error("Database error:", error);
        return status(500, { error: "Failed to fetch support conversations" });
      }
    })
    .post(
      "/support",
      async ({
        memberId,
        params,
        status,
        body,
      }: Props & { body: PostBody }) => {
        const { mid, lid } = params;

        try {
          console.log("Creating support conversation", JSON.stringify(body));
          const assistant = await db.query.supportAssistants.findFirst({
            where: (b, { eq, and }) => and(eq(b.locationId, lid)),
          });

          if (!assistant) {
            return status(404, { error: "Support assistant not found" });
          }
          const [conversation] = await db
            .insert(supportConversations)
            .values({
              memberId: mid,
              locationId: lid,
              supportAssistantId: assistant.id,
            })
            .returning();

          return status(200, conversation);
        } catch (error) {
          console.error("Database error:", error);
          return status(500, {
            error: "Failed to create support conversation",
          });
        }
      }
    );
}
