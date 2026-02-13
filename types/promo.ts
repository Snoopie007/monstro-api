import { promos } from "../schemas/promos"
import { Location } from "./location"
import { Member } from "./member"

export type Promo = typeof promos.$inferSelect & {
    member?: Member
    location?: Location
}