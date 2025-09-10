import { Elysia } from "elysia";
import { db } from "@/db/db";
import { supportConversations, supportMessages } from "@/db/schemas/support";
import { eq } from "drizzle-orm";
import { jwtVerify } from "jose";
import { ConnectionManager } from "./connectionManager.ts";
import { DatabaseListener } from "./databaseListener.ts";
import { setHealthCheckInstances } from "./health";

interface WebSocketData {
  conversationId: string;
  memberId: string;
  locationId: string;
  token: string;
}

// Use Elysia's WebSocket type instead of extending standard WebSocket
type AuthenticatedWebSocket = any; // Will be properly typed by Elysia

// Initialize managers
const connectionManager = new ConnectionManager();
const databaseListener = new DatabaseListener(connectionManager);

// Set up health check instances
setHealthCheckInstances(connectionManager, databaseListener);

export function realtimeRoutes(app: Elysia) {
  return app.ws("/chat/:cid", {
    // Authenticate before upgrading connection
    beforeHandle: async ({ params, headers, query, set }) => {
      try {
        const { cid } = params as { cid: string };

        // Try to get token from Authorization header first, then from query parameter
        let token: string | undefined;
        const authHeader = headers["authorization"];

        if (authHeader?.startsWith("Bearer ")) {
          token = authHeader.split(" ")[1];
        } else if (query.token) {
          // Support token as query parameter for browser WebSocket clients
          token = query.token as string;
        }

        // Verify JWT token
        if (!token) {
          set.status = 401;
          return {
            error:
              "Missing token - provide via Authorization header or ?token= query parameter",
          };
        }

        // Get appropriate JWT secret
        const authSecret: string | undefined = process.env.SUPABASE_JWT_SECRET || process.env.AUTH_SECRET;;
        if (!authSecret) {
          set.status = 500;
          return { error: "Server configuration error: Missing JWT secret" };
        }

        // Verify JWT token
        let payload: any;
        try {
          const secret = new TextEncoder().encode(authSecret);
          const result = await jwtVerify(token, secret);
          payload = result.payload;
        } catch (error: any) {
          set.status = 401;
          return {
            error: "JWT verification failed",
            details: error.message,
          };
        }

        const memberId =
          (payload as any).user_metadata?.member_id || payload.sub;

        if (!memberId) {
          set.status = 401;
          return { error: "Invalid token: missing member ID" };
        }

        // Verify conversation exists and belongs to member
        const conversation = await db.query.supportConversations.findFirst({
          where: eq(supportConversations.id, cid),
          with: { member: true },
        });

        if (!conversation) {
          set.status = 404;
          return { error: "Conversation not found" };
        }

        if (conversation.memberId !== memberId) {
          set.status = 403;
          return { error: "Access denied to this conversation" };
        }

        // Authentication successful - allow WebSocket upgrade
        return;
      } catch (error) {
        console.error("❌ WebSocket auth error:", error);
        set.status = 401;
        return { error: "Authentication failed" };
      }
    },

    async open(ws) {
      try {
        // Extract data from request context
        const wsData = ws.data as any;
        const pathParts = wsData.path?.split("/") || [];
        const conversationId = pathParts[pathParts.length - 1];

        // Get token from Authorization header
        const authHeader =
          wsData.headers?.authorization || wsData.headers?.Authorization;
        let token = "";

        if (authHeader?.startsWith("Bearer ")) {
          token = authHeader.split(" ")[1];
        } else {
          // Fallback to query param if header not available
          token = wsData.query?.token || "";
        }

        if (!token || !conversationId) {
          ws.close(1011, "Authentication data missing");
          return;
        }

        // Re-verify token and extract member data
        let memberId: string;
        let locationId: string;

        try {
          const authSecret =
            process.env.SUPABASE_JWT_SECRET || process.env.AUTH_SECRET;
          const secret = new TextEncoder().encode(authSecret);
          const { payload } = await jwtVerify(token, secret);
          memberId =
            (payload as Record<string, any>).user_metadata?.member_id ||
            payload.sub;

          // Get conversation and check if live chat is enabled
          const conversation = await db.query.supportConversations.findFirst({
            where: eq(supportConversations.id, conversationId as string),
          });

          if (!conversation) {
            ws.close(1011, "Conversation not found");
            return;
          }

          // Guard rail: Only allow live chat when vendor is active
          if (!conversation.isVendorActive) {
            ws.close(1011, "Live chat not available - AI mode only");
            return;
          }

          locationId = conversation?.locationId || "";
        } catch (error) {
          ws.close(1011, "Authentication failed");
          return;
        }

        // Register connection
        connectionManager.addConnection(
          conversationId as string,
          memberId as string,
          ws
        );

        // Subscribe to conversation and member channels
        ws.subscribe(`conversation:${conversationId}`);
        ws.subscribe(`member:${memberId}`);

        // Send initial connection success
        ws.send(
          JSON.stringify({
            type: "connection",
            status: "connected",
            conversationId,
            timestamp: new Date().toISOString(),
          })
        );

        // Send current conversation state
        await sendConversationState(ws, conversationId as string);
      } catch (error) {
        console.error("❌ Error in WebSocket open handler:", error);
      }
    },

    message(ws, message) {
      try {
        let data: any;

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
          } catch (error) {}
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

// Send current conversation state
async function sendConversationState(ws: any, conversationId: string) {
  try {
    const conversation = await db.query.supportConversations.findFirst({
      where: eq(supportConversations.id, conversationId),
      with: {
        messages: {
          orderBy: (m, { asc }) => asc(m.created),
          limit: 50,
        },
        assistant: true,
      },
    });

    if (conversation) {
      const stateData = {
        type: "conversation_state",
        data: {
          conversation,
          mode: conversation.isVendorActive ? "agent" : "assistant",
          agentInfo:
            (conversation.metadata as Record<string, any>)?.agent || null,
        },
      };

      ws.send(JSON.stringify(stateData));
    }
  } catch (error) {
    console.error("❌ Error sending conversation state:", error);
    try {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Failed to load conversation state",
        })
      );
    } catch (sendError) {
      console.error("❌ Failed to send error message:", sendError);
    }
  }
}

// Start database listener and periodic cleanup when module loads
databaseListener.start();
connectionManager.startPeriodicCleanup();

console.log("🚀 Realtime WebSocket system initialized");
