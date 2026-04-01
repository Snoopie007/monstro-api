import { migrateMembers } from "../schemas/MigrateMembers";
import type { Location } from "./location";
import type { Member, MemberPlanPricing } from "./member";

export type MigrateMember = typeof migrateMembers.$inferSelect & {
    pricing?: MemberPlanPricing | null
    member?: Member
    location?: Location
}