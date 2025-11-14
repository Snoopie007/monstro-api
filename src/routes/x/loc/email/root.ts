import { Elysia } from "elysia";
import { xEmailSend } from "./send";

export const xEmail = new Elysia({ prefix: "/email" })
    .use(xEmailSend);

