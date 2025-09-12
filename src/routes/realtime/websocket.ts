import { Elysia } from "elysia";
import { db } from "@/db/db";
import { supportConversations, supportMessages } from "@/db/schemas/support";
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

			try {
				const { memberId, params } = data as { memberId: string, params: { cid: string } };

				const conversation = await db.query.supportConversations.findFirst({
					where: eq(supportConversations.id, params.cid),
				});

				if (!conversation) {
					return close(1011, "Conversation not found");
				}

				// Guard rail: Only allow live chat when vendor is active
				if (!conversation.isVendorActive) {
					console.log("conversation not active");
					return close(1011, "Live chat not available - AI mode only");

				}

				// Register connection
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
					isVendorActive: conversation.isVendorActive,
					timestamp: new Date().toISOString(),
				}));


			} catch (error) {
				console.error("❌ Error in WebSocket open handler:", error);
			}
		},

		message(ws, message) {
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

				handleWebSocketMessage(ws, data);
			} catch (error) {
				console.error("❌ Invalid WebSocket message:", error);
				ws.send(
					JSON.stringify({
						type: "error",
						message: "Invalid message format",
					})
				);
			}
		},

		async close(ws, code, reason) {
			try {
				const wsData = ws.data as Record<string, any>;
				const pathParts = wsData?.path?.split("/") || [];
				const conversationId = pathParts[pathParts.length - 1];

				// Get token from Authorization header (more secure than query params)
				const authHeader =
					wsData?.headers?.authorization || wsData?.headers?.Authorization;
				let token = "";

				if (authHeader?.startsWith("Bearer ")) {
					token = authHeader.split(" ")[1];
				} else {
					// Fallback to query param if header not available
					token = wsData?.query?.token || "";
				}

				if (token && conversationId) {
					// Extract member ID from token for cleanup
					try {
						const authSecret =
							process.env.SUPABASE_JWT_SECRET || process.env.AUTH_SECRET;
						const secret = new TextEncoder().encode(authSecret);
						const { payload } = await jwtVerify(token, secret);
						const memberId =
							(payload as any).user_metadata?.member_id || payload.sub;

						connectionManager.removeConnection(conversationId, memberId);
					} catch (error) { }
				}
			} catch (error) {
				console.error("❌ Error in WebSocket close handler:", error);
			}
		},
	});
}

// Handle incoming WebSocket messages
async function handleWebSocketMessage(ws: any, data: any) {
	const { type, payload } = data;

	switch (type) {
		case "send_message":
			await handleSendMessage(ws, payload);
			break;

		case "ping":
			ws.send(
				JSON.stringify({ type: "pong", timestamp: new Date().toISOString() })
			);
			break;

		default:
			ws.send(
				JSON.stringify({
					type: "error",
					message: `Unknown message type: ${type}`,
				})
			);
	}
}

// Handle sending messages
async function handleSendMessage(ws: any, payload: any) {
	try {
		// Extract conversation ID and member ID from request context
		const wsData = ws.data as Record<string, any>;
		const pathParts = wsData.path?.split("/") || [];
		const conversationId = pathParts[pathParts.length - 1];

		// Get token from Authorization header (more secure than query params)
		const authHeader =
			wsData.headers?.authorization || wsData.headers?.Authorization;
		let token = "";

		if (authHeader?.startsWith("Bearer ")) {
			token = authHeader.split(" ")[1];
		} else {
			// Fallback to query param if header not available (for browser compatibility)
			token = wsData.query?.token || "";
		}

		if (!token || !conversationId) {
			ws.send(
				JSON.stringify({
					type: "error",
					message: "Missing authentication data",
				})
			);
			return;
		}

		// Extract member ID from token
		let memberId: string;
		try {
			const authSecret =
				process.env.SUPABASE_JWT_SECRET || process.env.AUTH_SECRET;
			const secret = new TextEncoder().encode(authSecret);
			const { payload } = await jwtVerify(token, secret);
			memberId =
				(payload as Record<string, any>).user_metadata?.member_id ||
				payload.sub;
		} catch (error) {
			ws.send(
				JSON.stringify({
					type: "error",
					message: "Authentication failed",
				})
			);
			return;
		}

		const { content } = payload;

		// Get conversation to verify it exists and is active
		const conversation = await db.query.supportConversations.findFirst({
			where: eq(supportConversations.id, conversationId),
		});

		if (!conversation) {
			throw new Error("Conversation not found");
		}

		if (!["open", "pending", "active"].includes(conversation.status)) {
			throw new Error("Conversation is not active");
		}

		// Save user message - this will trigger database listener to broadcast
		const [userMessage] = await db
			.insert(supportMessages)
			.values({
				conversationId,
				content,
				role: "human",
				channel: "WebChat",
				metadata: {
					savedAt: new Date().toISOString(),
					source: "websocket",
					senderId: memberId, // Track who sent the message to prevent echo
				},
			})
			.returning();

		// Update conversation timestamp
		await db
			.update(supportConversations)
			.set({
				updated: new Date(),
			})
			.where(eq(supportConversations.id, conversationId));

		console.log(`💬 User message saved to conversation ${conversationId}`);

		// Note: AI response generation happens via separate API route
		// The WebSocket only handles real-time message broadcasting
	} catch (error) {
		console.error("Error handling send message:", error);
		ws.send(
			JSON.stringify({
				type: "error",
				message:
					error instanceof Error ? error.message : "Failed to send message",
			})
		);
	}
}


// Start database listener and periodic cleanup when module loads
databaseListener.start();
connectionManager.startPeriodicCleanup();

console.log("🚀 Realtime WebSocket system initialized");