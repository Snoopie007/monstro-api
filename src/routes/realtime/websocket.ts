import { Elysia } from "elysia";
import { db } from "@/db/db";
import { supportConversations } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { jwtVerify } from "jose";
import { ConnectionManager, DatabaseListener } from "@/libs/ws/";
import { setHealthCheckInstances } from "./health";


// Initialize managers
const connectionManager = new ConnectionManager();
const databaseListener = new DatabaseListener(connectionManager);

// Set up health check instances
setHealthCheckInstances(connectionManager, databaseListener);

export function realtimeRoutes(app: Elysia) {
	return app.derive(async ({ status, params, query }) => {
		try {
			const { cid } = params as { cid: string };
			const { token } = query as { token: string };

			if (!token) {
				return status(401, { error: "Missing token " });
			}

			if (!process.env.SUPABASE_JWT_SECRET) {
				return status(500, { error: "Server configuration error: Missing JWT secret" });
			}


			const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
			const result = await jwtVerify(token, secret);
			const payload = result.payload as Record<string, any>;

			const memberId = (payload).user_metadata?.member_id || payload.sub;

			if (!memberId) {
				return status(401, { error: "Invalid token: missing member ID" });
			}

			// Verify conversation exists and belongs to member
			const conversation = await db.query.supportConversations.findFirst({
				where: eq(supportConversations.id, cid)
			});

			if (!conversation) {
				return status(404, { error: "Conversation not found" });
			}

			if (conversation.memberId !== memberId) {
				return status(403, { error: "Access denied to this conversation" });
			}


			return {
				memberId
			}
		} catch (error) {
			console.error("❌ WebSocket auth error:", error);
			return status(401, { error: "Authentication failed" });
		}

	}).ws("/support/:cid", {
		async open(ws) {
			const { data, close, subscribe, send, ping } = ws;
			const { memberId, params } = data as { memberId: string, params: { cid: string } };

			console.log("🚀 WebSocket open", memberId, params);
			try {

				const conversation = await db.query.supportConversations.findFirst({
					where: eq(supportConversations.id, params.cid),
				});

				if (!conversation) {
					return close(1011, "Conversation not found");
				}

				connectionManager.addConnection(
					params.cid as string,
					memberId as string,
					send,
					ping
				);

				subscribe(`conversation:${params.cid}`);

				send(JSON.stringify({
					type: "connection",
					status: "connected",
					timestamp: new Date().toISOString(),
				}));


			} catch (error) {
				console.error("❌ Error in WebSocket open handler:", error);
			}
		},

		message(ws, message) {
			const { data, send } = ws;
			try {
				let data: Record<string, any>;

				// Handle different message formats
				if (typeof message === "string") {
					data = JSON.parse(message);
				} else if (typeof message === "object" && message !== null) {
					data = message; // Already an object
				} else {
					// Try to convert to string and parse
					const messageStr = (message as any).toString();
					data = JSON.parse(messageStr);
				}

				handleWebSocketMessage(send, data);
			} catch (error) {
				console.error("❌ Invalid WebSocket message:", error);
				send(JSON.stringify({
					type: "error",
					message: "Invalid message format",
				}));
			}
		},

		async close(ws, code, reason) {
			const { data } = ws;
			const { memberId, params } = data as { memberId: string, params: { cid: string } };

			try {
				connectionManager.removeConnection(params.cid, memberId);
			} catch (error) {
				console.error("❌ Error in WebSocket close handler:", error);
			}
		},
	});
}

// Handle incoming WebSocket messages
async function handleWebSocketMessage(
	send: (data: unknown, compress?: boolean) => number,
	data: Record<string, any>
) {
	const { type, payload } = data;

	switch (type) {

		case "ping":
			send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
			break;

		default:
			send(JSON.stringify({
				type: "error",
				message: `Unknown message type: ${type}`,
			}));
	}
}

databaseListener.start();
connectionManager.startPeriodicCleanup();

console.log("🚀 Realtime WebSocket system initialized");