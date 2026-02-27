import { Elysia } from "elysia";
import { assistantChatRoute } from "./chat";

export const xAssistant = new Elysia({ prefix: "/assistant" }).use(assistantChatRoute);
