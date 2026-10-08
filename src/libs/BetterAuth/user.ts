import { generateUsername } from "@/utils/userUtils";

export const usernameField = {
    type: "string",
    required: false,
    input: false,
} as const;

export function withGeneratedUsername<T extends { name: string; username?: string | null }>(user: T) {
    return {
        ...user,
        username: user.username || generateUsername(user.name),
    };
}
