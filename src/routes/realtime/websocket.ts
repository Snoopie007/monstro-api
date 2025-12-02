import { Elysia } from "elysia";
import { GroupsListener } from "@/libs/ws/";

// Initialize groups listener for notifications
const groupsListener = new GroupsListener();

export function realtimeRoutes(app: Elysia) {
	// No WebSocket routes needed - support chat now uses Supabase Realtime broadcast
	return app;
}

// Start the groups listener for notifications
groupsListener.start();

console.log("🚀 Realtime system initialized (Groups listener active)");
