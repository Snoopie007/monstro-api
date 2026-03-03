// src/state.ts (or src/libs/globalState.ts)
export const ServerState = {
    onlineUsers: new Set<string>(),
};


export function addOnlineUser(userId: string): void {
    ServerState.onlineUsers.add(userId);
}

export function removeOnlineUser(userId: string): void {
    ServerState.onlineUsers.delete(userId);
}

export function isUserOnline(userId: string): boolean {
    return ServerState.onlineUsers.has(userId);
}

export function getOnlineUserIds(): string[] {
    return Array.from(ServerState.onlineUsers.keys());
}

export function setOnlineUserIds(userIds: string[]): void {
    ServerState.onlineUsers = new Set(userIds);
}