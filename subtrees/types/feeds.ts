import { userFeeds } from "../schemas/chat/moments";

import type { Group, GroupPost } from "./group";
import type { Moment } from "./moments";
import type { User } from "./user";

export type UserFeed = typeof userFeeds.$inferSelect & {
    moment?: Moment | null;
    post?: GroupPost | null;
    author?: User | null;
    group?: Group | null;
}