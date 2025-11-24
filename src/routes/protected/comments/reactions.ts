import { db } from "@/db/db";
import type { Elysia } from "elysia";

export function commentReactions(app: Elysia) {
    return app.get('/reactions', async ({ params, status }) => {

    })
}