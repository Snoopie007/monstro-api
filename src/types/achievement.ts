import { achievements, actions } from "@/db/schemas";
import { Member } from "./member";
import { Program } from "./program";


export type Action = typeof actions.$inferSelect & {
    achievement: Achievement
}

export type Achievement = typeof achievements.$inferSelect & {

    actions: Action[] | [],
    program?: Program,

    members?: Member[]
}