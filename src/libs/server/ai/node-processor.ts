import { db } from "@/db/db";
import { eq, and } from "drizzle-orm";
import { bots } from "@/db/schemas";
import { NodeDataType, Bot, AIFunction } from "@/types/bots";
import { getRedisClient } from "../redis";

// Session context for tracking conversation state
export interface SessionContext {
  id: string;
  botId: string;
  currentNode: string;
  routineNode: string | null;
  stopped: string | null;
  metadata: {
    location: any;
    contact: any;
    isTestSession?: boolean;
    memberId?: string;
    collectedData?: Record<string, any>;
  };
  conversationHistory: Array<{
    nodeId: string;
    timestamp: Date;
    userMessage?: string;
    botResponse?: string;
    toolCalls?: any[];
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Core interface for processing admin chat messages
export interface AdminChatData {
  locationId: string;
  botId: string;
  sessionId: string;
  message: string;
  contactId?: string;
  isTestSession?: boolean;
}

// Main processing function for admin chat
export async function processAdminChat(data: AdminChatData) {
  const {
    locationId,
    botId,
    sessionId,
    message,
    contactId,
    isTestSession = true,
  } = data;

  try {
    // 1. Fetch bot and location data
    const [location, bot] = await Promise.all([
      db.query.locations.findFirst({
        where: (locations, { eq }) => eq(locations.id, locationId),
      }),
      db.query.bots.findFirst({
        where: (bots, { eq, and }) =>
          and(eq(bots.id, botId), eq(bots.locationId, locationId)),
      }),
    ]);

    if (!location || !bot) {
      throw new Error("Location or bot not found");
    }

    // 2. Get or create session context
    const redis = getRedisClient();
    const sessionKey = `admin-session:${botId}:${sessionId}`;
    const sessionData = await redis.json.get(sessionKey, "$");
    let session = (
      Array.isArray(sessionData) ? sessionData[0] : sessionData
    ) as SessionContext | null;

    if (!session) {
      // Determine starting node from bot objectives
      let startingNode = "start";
      if (bot.objectives && bot.objectives.length > 0) {
        const firstObjective = bot.objectives[0] as NodeDataType;
        startingNode = firstObjective.label || "start";
      }

      session = createNewSession(
        sessionId,
        botId,
        location,
        contactId,
        isTestSession,
        startingNode
      );
    }

    // 3. Process message through node flow
    const response = await processNodeFlow(session, bot, message);

    // 4. Update session state and save
    session.updatedAt = new Date();
    session.conversationHistory.push({
      nodeId: session.currentNode,
      timestamp: new Date(),
      userMessage: message,
      botResponse: response.content,
      toolCalls: response.toolCalls || [],
    });

    // Save session with TTL (2 hours for admin sessions)
    await redis.json.set(sessionKey, "$", session as any);
    await redis.expire(sessionKey, 60 * 60 * 2);

    return {
      content: response.content,
      role: "ai" as const,
      metadata: {
        botId,
        sessionId,
        currentNode: session.currentNode,
        nodeTransition: response.nodeTransition,
        toolCalls: response.toolCalls,
        timestamp: new Date(),
        processed: true,
      },
    };
  } catch (error) {
    console.error(
      `❌ Failed to process admin chat for session ${sessionId}:`,
      error
    );
    throw error;
  }
}

// Create a new session context
function createNewSession(
  sessionId: string,
  botId: string,
  location: any,
  contactId?: string,
  isTestSession = true,
  startingNode = "start"
): SessionContext {
  return {
    id: sessionId,
    botId,
    currentNode: startingNode,
    routineNode: null,
    stopped: null,
    metadata: {
      location,
      contact: contactId
        ? { id: contactId, type: "test" }
        : { id: "test", type: "test" },
      isTestSession,
      collectedData: {},
    },
    conversationHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Core node flow processing logic
async function processNodeFlow(
  session: SessionContext,
  bot: any,
  message: string
): Promise<{
  content: string;
  nodeTransition?: { from: string; to: string; reason?: string };
  toolCalls?: any[];
}> {
  const currentNodeId = session.currentNode;
  // Find current node in bot objectives
  const currentNode = bot.objectives?.find(
    (obj: NodeDataType) => obj.label === currentNodeId
  ) as NodeDataType | undefined;

  if (!currentNode) {
    // Try to recover by finding the first available node or default to "start"
    const availableNodes = bot.objectives?.map((obj: any) => obj.label) || [];
    const fallbackNode = availableNodes.includes("start")
      ? "start"
      : availableNodes.length > 0
      ? availableNodes[0]
      : "start";

    // Update session to fallback node
    session.currentNode = fallbackNode;

    // Return without a transition to avoid self-loops
    return {
      content:
        "I'm having trouble processing your request. Let me help you with that.",
      nodeTransition:
        availableNodes.length > 0
          ? {
              from: currentNodeId,
              to: fallbackNode,
              reason: "Node recovery - redirecting to available node",
            }
          : undefined, // No transition if no nodes available
    };
  }

  // Execute any functions/tools defined for this node
  const toolCalls: any[] = [];
  if (currentNode.functions && currentNode.functions.length > 0) {
    for (const func of currentNode.functions) {
      try {
        // Check if tool should execute based on message content
        if (shouldExecuteTool(func, message)) {
          const toolResult = await executeNodeFunction(func, message, session);

          // Only record successful tool calls (non-null results)
          if (toolResult !== null && toolResult !== undefined) {
            toolCalls.push({
              function: func.name,
              result: toolResult,
              timestamp: new Date(),
            });
          }
        }
      } catch (error) {
        console.error(`Tool execution failed for ${func.name}:`, error);
      }
    }
  }

  // Generate response based on current node
  const nodeResponse = await generateNodeResponse(
    currentNode,
    message,
    session,
    bot
  );

  // Determine next node based on paths and message analysis
  const nextNode = await determineNextNode(currentNode, message, session);

  let nodeTransition = undefined;
  if (nextNode && nextNode !== currentNodeId) {
    session.currentNode = nextNode;
    nodeTransition = {
      from: currentNodeId,
      to: nextNode,
      reason: "Flow progression",
    };
  }

  return {
    content: nodeResponse,
    nodeTransition,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}

// Generate response based on current node configuration
async function generateNodeResponse(
  node: NodeDataType,
  message: string,
  session: SessionContext,
  bot: any
): Promise<string> {
  // For Phase 2, we'll use a simple template-based approach
  // This would be enhanced with actual AI model calls in production

  const basePrompt = bot.prompt || "";
  const nodeInstructions = node.instructions || "";
  const nodeGoal = node.goal || "";

  // Simple response generation based on node configuration
  let response = "";

  if (
    node.label.toLowerCase().includes("greet") ||
    node.label.toLowerCase().includes("welcome")
  ) {
    response =
      bot.initialMessage ||
      `Hello! I'm here to help you with ${nodeGoal.toLowerCase()}.`;
  } else if (
    node.label.toLowerCase().includes("assess") ||
    node.label.toLowerCase().includes("understand")
  ) {
    response = `I'd like to better understand your needs. ${
      nodeInstructions || "How can I help you today?"
    }`;
  } else {
    // Default response using node goal and instructions
    response = `${
      nodeInstructions || `I'm working on: ${nodeGoal}`
    } Based on your message "${message}", let me help you further.`;
  }

  // Add persona flavor if available
  // Note: Persona data not loaded to avoid relation issues
  // This could be enhanced later with a separate persona query if needed

  return response;
}

// Determine next node based on current node paths and message content
async function determineNextNode(
  currentNode: NodeDataType,
  message: string,
  session: SessionContext
): Promise<string | null> {
  if (!currentNode.paths) {
    return null;
  }

  const messageLower = message.toLowerCase();

  // Simple keyword-based path determination
  // First check for keyword matches, then fall back to default
  for (const [pathKey, nextNodeId] of Object.entries(currentNode.paths)) {
    // Skip the default "next" path for now
    if (pathKey === "next") {
      continue;
    }

    // Check if message contains keywords related to the path
    if (
      messageLower.includes(pathKey.toLowerCase()) ||
      messageLower.includes(nextNodeId.toLowerCase())
    ) {
      return nextNodeId;
    }
  }

  // If no specific path matches, use default 'next' path
  return currentNode.paths.next || null;
}

// Check if a tool should execute based on message content
function shouldExecuteTool(func: AIFunction, message: string): boolean {
  const messageLower = message.toLowerCase();

  switch (func.name) {
    case "extract_email":
      // Only execute if message contains email pattern
      return /[\w.-]+@[\w.-]+\.\w+/.test(message);

    case "extract_phone":
      // Only execute if message contains phone pattern (more than 7 digits)
      const phoneMatch = message.match(/\d/g);
      return phoneMatch !== null && phoneMatch.length >= 7;

    case "save_data":
      // Always execute save_data when defined
      return true;

    default:
      // For unknown tools, always try to execute
      return true;
  }
}

// Execute functions/tools defined in a node
async function executeNodeFunction(
  func: AIFunction,
  message: string,
  session: SessionContext
): Promise<any> {
  // Placeholder for tool execution
  // This would integrate with the actual tool system
  console.log(`Executing function: ${func.name} with message: ${message}`);

  switch (func.name) {
    case "extract_email":
      const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
      return emailMatch ? emailMatch[0] : null;

    case "extract_phone":
      const phoneMatch = message.match(/[\d\s\-\(\)]+/);
      return phoneMatch ? phoneMatch[0].replace(/\D/g, "") : null;

    case "save_data":
      // Save to session metadata
      if (func.parameters.key && func.parameters.value) {
        session.metadata.collectedData = session.metadata.collectedData || {};
        session.metadata.collectedData[func.parameters.key] =
          func.parameters.value;
      }
      return true;

    default:
      return `Function ${func.name} executed`;
  }
}

// Get session for external access
export async function getSession(
  botId: string,
  sessionId: string
): Promise<SessionContext | null> {
  const redis = getRedisClient();
  const sessionKey = `admin-session:${botId}:${sessionId}`;
  const sessionData = await redis.json.get(sessionKey, "$");
  return (
    Array.isArray(sessionData) ? sessionData[0] : sessionData
  ) as SessionContext | null;
}

// Reset session to starting node
export async function resetSession(
  botId: string,
  sessionId: string
): Promise<void> {
  const redis = getRedisClient();
  const sessionKey = `admin-session:${botId}:${sessionId}`;
  await redis.del(sessionKey);
}
