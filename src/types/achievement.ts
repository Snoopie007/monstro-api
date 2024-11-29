import { Program } from "./program";


export type Action = {
    id: number,
    name: string,
    pivot: any
}


export type Achievement = {
    id?: number,
    name: string,
    badge: string,
    rewardPoints: number,
    action: Action[] | [],
    program: Program,
    actionCount: number
}