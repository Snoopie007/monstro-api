import { momentLikes, moments } from "../schemas/chat/moments";
import type { Comment } from "./group";
import type { Media } from "./medias";
import type { User } from "./user";

export type Moment = typeof moments.$inferSelect & {
    author?: User;
    medias?: Media[];
    comments?: Comment[];
}

export type MomentLike = typeof momentLikes.$inferSelect & {
    user?: User;
}
