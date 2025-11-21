import { GroupCommunity } from "./groups";
import { Member } from "./member";
import { User } from "./user";

export type Chat = {
    id: string;
    startedBy: string;
    name?: string | null;
    created: Date;
    updated?: Date | null;
    chatMembers?: ChatMember[];
    messages?: Message[];
    group?: GroupCommunity;
    groupId: string | null;
}   

export type ChatMember = {
    chatId: string;
    userId: string;
    joined: Date;
    member?: Member;
}

export type Message = {
    id: string;
    chatId: string;
    senderId?: string | null;
    content: string;
    attachments: Array<Record<string, any>>;
    readBy: string[];
    metadata: Record<string, any>;
    sender?: User;
    created: Date;
    updated?: Date | null;
    media?: Array<{
        id: string;
        url: string;
        thumbnailUrl: string | null;
        fileName: string;
        fileType: string;
        mimeType: string | null;
        altText: string | null;
    }>;
}