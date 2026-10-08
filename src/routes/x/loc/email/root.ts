import { Elysia } from "elysia";
import { xEmailSend } from "./send";
import { xEmailQueue } from "./queue";

export const xEmail = new Elysia({ prefix: "/email" })
    .use(xEmailSend)
    .use(xEmailQueue);
