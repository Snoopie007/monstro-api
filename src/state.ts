// src/state.ts (or src/libs/globalState.ts)
export const serverState = {
    onlineUsers: new Set<string>(),
};


export function addOnlineUser(userId: string): void {
    serverState.onlineUsers.add(userId);
}

export function removeOnlineUser(userId: string): void {
    serverState.onlineUsers.delete(userId);
}

export function isUserOnline(userId: string): boolean {
    return serverState.onlineUsers.has(userId);
}

export function getOnlineUserIds(): string[] {
    return Array.from(serverState.onlineUsers.keys());
}