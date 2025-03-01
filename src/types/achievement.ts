import { Member } from "./member";
import { Program } from "./program";


export type Action = {
    id: number,
    name: string,
    count: number
}

export type Achievement = {
    id?: number,
    title: string,
    description: string | null,
    icon: string | null,
    badge: string,
    points: number,
    actions: Action[] | [],
    program?: Program,
    actionCount: number,
    members?: Member[]
}