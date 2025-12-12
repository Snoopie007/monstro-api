import { User } from "./user";
import { chats, messages } from "@/db/schemas";
import { Media } from "./media";
import { ReactionCounts } from "./reactions";
import { Location } from "./location";
import { Group } from "./groups";

export type Chat = typeof chats.$inferSelect & {
    messages?: Message[];
    startedBy?: User;
    location?: Location;
    group?: Group;
}

export type Message = typeof messages.$inferSelect & {
    sender?: User;
    media?: Media[];
    reactions?: ReactionCounts[];
}