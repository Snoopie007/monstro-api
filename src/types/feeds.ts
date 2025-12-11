import { userFeeds } from "@/db/schemas/chat/moments";

import type { GroupPost } from "./group";
import type { Group } from "./group";
import type { User } from "./user";
import type { Moment } from "./moments";

export type UserFeed = typeof userFeeds.$inferSelect & {
    moment?: Moment | null;
    post?: GroupPost | null;
    author?: User | null;
    group?: Group | null;
}