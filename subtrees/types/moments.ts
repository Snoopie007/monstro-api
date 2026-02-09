import { momentLikes, moments } from "subtrees/schemas";
import type { User } from "./user";
import type { Comment } from "./group";

export type Moment = typeof moments.$inferSelect & {
    author?: User;
    comments?: Comment[];
}

export type MomentLike = typeof momentLikes.$inferSelect & {
    user?: User;
}