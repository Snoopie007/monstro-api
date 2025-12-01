import { Elysia } from "elysia";
import { memberChatRoute } from "./member";

export const xChat = new Elysia({ prefix: "/chat" })
    .use(memberChatRoute);

