import { Elysia } from "elysia";
import { supportConversation } from "./conversation";
import { supportMessagesRoute } from "./messages";
import { testChatRoute } from "./test";

export const locationSupport = new Elysia({ prefix: "/support" })
  .use(testChatRoute)
  .group("/conversations/:cid", (app) => {
    app.use(supportConversation);
    app.use(supportMessagesRoute);
    return app;
  });
