import { promos } from "../schemas/promos"
import type { Location } from "./location"
import type { Member } from "./member"

export type Promo = typeof promos.$inferSelect & {
    member?: Member
    location?: Location
}