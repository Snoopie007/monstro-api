import { getRedisClient } from "@/libs/redis";
import {
    mapChatMessagesToStoredMessages,
    mapStoredMessagesToChatMessages,
    type BaseMessage,
} from "@langchain/core/messages";

const redis = getRedisClient();

export function isAwaitingStaffFollowUp(stored: BaseMessage[]) {
    const last = stored.at(-1);
    if (!last) return false;
    return toTextContent(last.content).includes("awaiting_input");
}

export function toTextContent(content: unknown): string {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content
            .map((item) => {
                if (typeof item === "string") return item;
                if (typeof item === "object" && item !== null && "text" in item) {
                    const text = (item as { text?: unknown }).text;
                    return typeof text === "string" ? text : "";
                }
                return "";
            })
            .join(" ")
            .trim();
    }
    return "";
}

function parseStoredMessage(value: unknown) {
    let current: unknown = value;
    while (typeof current === "string") {
        try {
            current = JSON.parse(current);
        } catch {
            return null;
        }
    }
    if (!current || typeof current !== "object") return null;
    const record = current as { type?: unknown; data?: { content?: unknown } };
    if (typeof record.type !== "string" || record.data?.content === undefined) return null;
    return current as { type: string; data: { content: unknown } };
}

export async function loadAgentHistory(sessionId: string) {
    const raw = await redis.lrange(sessionId, 0, -1);
    const stored = raw.map(parseStoredMessage).filter((item) => item !== null);
    return mapStoredMessagesToChatMessages(stored.reverse() as Parameters<typeof mapStoredMessagesToChatMessages>[0]);
}

export async function saveAgentMessages(sessionId: string, messages: BaseMessage[], ttlSeconds: number) {
    if (messages.length === 0) return;
    const stored = mapChatMessagesToStoredMessages(messages);
    await redis.lpush(sessionId, ...stored);
    await redis.expire(sessionId, ttlSeconds);
}
