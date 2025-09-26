import { Elysia } from "elysia";
import { testChatRoute } from "./test";

export const xSupport = new Elysia({ prefix: "/support" })
    .use(testChatRoute)
