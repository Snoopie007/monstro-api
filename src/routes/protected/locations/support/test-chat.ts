import type { Elysia } from "elysia";
import { getModel, calculateAICost, DEFAULT_SUPPORT_TOOLS } from "@/libs/ai";
import { db } from "@/db/db";
import { supportAssistants } from "@/db/schemas/support";
import { eq } from "drizzle-orm";
import { formattedPrompt } from "@/libs/ai/Prompts";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
} from "@langchain/core/prompts";
import { AIMessage, ToolMessage, HumanMessage } from "@langchain/core/messages";
import type {
  Location,
  Member,
  TestChatMessage,
  TestChatSession,
} from "@/types";
import { getRedisClient } from "@/libs/redis";
import { invokeTestBot } from "@/libs/ai/TestChat";

type Props = {
  params: {
    lid: string;
  };
  body: {
    message: string;
    sessionId: string;
    testMemberId?: string;
  };
  status: any;
};

export async function testChatRoute(app: Elysia) {
  const redis = getRedisClient();

  const cleanupOldSessions = async () => {
    try {
      const keys = await redis.keys("test_chat:*");
      const cutoffTime = Date.now() - 60 * 60 * 1000; // 1 hour ago

      for (const key of keys) {
        const session: TestChatSession | null = await redis.get(key);
        if (session && session.lastActivity < cutoffTime) {
          await redis.del(key);
          console.log(`🧹 Cleaned up old test chat session: ${key}`);
        }
      }
    } catch (error) {
      console.error("Error cleaning up old sessions:", error);
    }
  };

  return app
    .post("/test-chat", async ({ body, status, params }: Props) => {
      const { lid } = params;
      const { message, sessionId, testMemberId } = body;

      try {
        cleanupOldSessions();
        // Get support assistant
        const assistant = await db.query.supportAssistants.findFirst({
          where: eq(supportAssistants.locationId, lid),
          with: {
            triggers: true,
          },
        });

        if (!assistant) {
          return status(404, { error: "Support assistant not found" });
        }

        // Get or create test chat session from Redis
        const sessionKey = `test_chat:${sessionId}`;
        let session: TestChatSession | null = await redis.get(sessionKey);

        if (!session) {
          session = {
            sessionId,
            locationId: lid,
            messages: [],
            lastActivity: Date.now(),
            testMemberId,
          };
        }

        // Add user message to session
        const userMessage: TestChatMessage = {
          role: "user",
          content: message,
          timestamp: Date.now(),
        };
        session.messages.push(userMessage);
        session.lastActivity = Date.now();

        // Save session to Redis with 2 hour expiration
        await redis.setex(sessionKey, 7200, session);
        let ml;
        if (testMemberId) {
          const memberLocation = await db.query.memberLocations.findFirst({
            where: (ml, { eq, and }) =>
              and(eq(ml.memberId, testMemberId), eq(ml.locationId, lid)),
            with: {
              member: true,
              location: true,
            },
          });

          if (memberLocation) {
            ml = memberLocation;
            console.log(
              `🧪 Using real member data for testing: ${ml.member.firstName} ${ml.member.lastName}`
            );
          } else {
            console.log(
              `⚠️ Member ${testMemberId} not found in location ${lid}, using mock data`
            );
            ml = createMockMemberLocation(testMemberId, lid);
          }
        } else {
          ml = createMockMemberLocation("test-member-id", lid);
        }
        // Get AI model
        const model = getModel(assistant.model, (output) => {
          const usage = output.llmOutput?.tokenUsage;
          if (usage) {
            const cost = calculateAICost(usage, assistant.model);
            console.log(`💰 Test chat AI cost: ${cost} credits`);
          }
        });

        const tools: Record<string, any>[] = [];
        DEFAULT_SUPPORT_TOOLS.forEach((tool) => {
          tools.push({
            type: "function",
            function: tool,
          });
        });

        const modelWithTools = model.bindTools(tools);
        const systemPrompt = await formattedPrompt({ ml, assistant });

        const prompt = ChatPromptTemplate.fromMessages([
          SystemMessagePromptTemplate.fromTemplate(
            systemPrompt +
              "\n\nIMPORTANT: This is a TEST CHAT session. Do not make any real changes to member data. You can view member information but avoid making modifications."
          ),
          new MessagesPlaceholder(`history`),
        ]);

        const modelWithPrompt = prompt.pipe(modelWithTools);
        // Convert session messages to LangChain format
        const history = session.messages.map((msg) => {
          switch (msg.role) {
            case "user":
              return new HumanMessage({ content: msg.content });
            case "ai":
            case "assistant":
              return new AIMessage({
                content: msg.content,
                tool_calls: msg.tool_calls,
              });
            case "tool":
              return new ToolMessage({
                content: msg.content,
                tool_call_id: msg.tool_call_id || "",
                name: msg.metadata?.tool_name || "unknown",
              });
            default:
              return new HumanMessage({ content: msg.content });
          }
        });

        // Create test conversation object for compatibility
        const testConversation = {
          id: `test-${sessionId}`,
          status: "active",
          isVendorActive: false,
          assistant,
        };
        const aiResponse = await invokeTestBot(
          modelWithPrompt,
          history,
          testConversation,
          ml,
          sessionKey,
          redis
        );

        return status(200, aiResponse);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error("💥 Test chat error:", message);
        return status(500, {
          error: "Failed to process test message",
          details: message,
        });
      }
    })
    .get("/test-chat/:sessionId", async ({ params, status }) => {
      try {
        const sessionKey = `test_chat:${params.sessionId}`;
        const session: TestChatSession | null = await redis.get(sessionKey);

        if (!session) {
          return status(404, { error: "Test chat session not found" });
        }

        return status(200, { session });
      } catch (error) {
        console.error("Error fetching test chat session:", error);
        return status(500, { error: "Failed to fetch test chat session" });
      }
    })
    .delete("/test-chat/:sessionId", async ({ params, status }) => {
      try {
        const sessionKey = `test_chat:${params.sessionId}`;
        await redis.del(sessionKey);

        return status(200, { message: "Test chat session deleted" });
      } catch (error) {
        console.error("Error deleting test chat session:", error);
        return status(500, { error: "Failed to delete test chat session" });
      }
    });
}

function createMockMemberLocation(memberId: string, locationId: string) {
  return {
    member: {
      id: memberId,
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
    } as Member,
    location: {
      id: locationId,
      name: "Test Location",
    } as Location,
    waiverId: null,
    status: "active" as const,
    updated: new Date(),
    created: new Date(),
    locationId: locationId,
    memberId: memberId,
    inviteDate: new Date(),
    points: 0,
    inviteAcceptedDate: new Date(),
  };
}
