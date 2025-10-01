import { Elysia } from "elysia";
import { supportConversation } from "./conversation";
import { supportMessagesRoute } from "./messages";

export const locationSupport = new Elysia({ prefix: "/support" })
  .group("/conversations/:cid", (app) => {
    app.use(supportConversation);
    app.use(supportMessagesRoute);
    return app;
  });
