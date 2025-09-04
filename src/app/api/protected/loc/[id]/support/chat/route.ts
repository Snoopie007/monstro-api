import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { supportBots, supportTriggers } from "@/db/schemas";
import { getModel } from "@/libs/server/ai/models";
import {
  buildSupportPrompt,
  buildSupportTools,
  evaluateTriggers,
} from "@/libs/server/ai/support";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { messages, sessionId, testMemberId } = body;

    if (!messages?.length || !sessionId) {
      return NextResponse.json(
        { error: "Messages and sessionId are required" },
        { status: 400 }
      );
    }

    // Get support bot configuration (simplified for testing)
    const supportBot = await db.query.supportBots.findFirst({
      where: eq(supportBots.locationId, params.id),
    });

    // Get active triggers separately for now
    const activeTriggers = supportBot
      ? await db.query.supportTriggers.findMany({
          where: (triggers, { eq, and }) =>
            and(
              eq(triggers.supportBotId, supportBot.id),
              eq(triggers.isActive, true)
            ),
        })
      : [];

    // Attach triggers to supportBot
    if (supportBot) {
      (supportBot as any).triggers = activeTriggers;
    }

    if (!supportBot) {
      return NextResponse.json(
        { error: "Support bot not found" },
        { status: 404 }
      );
    }

    // Get the latest user message
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || latestMessage.role !== "user") {
      return NextResponse.json(
        { error: "Latest message must be from user" },
        { status: 400 }
      );
    }

    // Check for trigger activation
    const activatedTrigger = evaluateTriggers(
      latestMessage.content,
      supportBot.triggers
    );

    // Build context for AI model
    const contactInfo = testMemberId
      ? await getTestMemberContext(testMemberId, params.id)
      : {
          firstName: "Test",
          lastName: "User",
          type: "test" as const,
          supportMetadata: {},
        };

    // Build enhanced system prompt with member context
    let systemPrompt = buildSupportPrompt(supportBot, contactInfo);

    // Add member context for tool calls if testing with a member
    if (testMemberId && contactInfo.type === "member") {
      systemPrompt += `\n\nIMPORTANT: When using member tools, ALWAYS use this member ID: ${testMemberId}`;
      systemPrompt += `\nYou are currently helping: ${contactInfo.firstName} ${contactInfo.lastName}`;
      systemPrompt += `\nFor ALL member tool calls, you MUST provide the memberId parameter like this:`;
      systemPrompt += `\n- get_member_status: {"memberId": "${testMemberId}"}`;
      systemPrompt += `\n- get_member_billing: {"memberId": "${testMemberId}"}`;
      systemPrompt += `\n- get_member_bookable_sessions: {"memberId": "${testMemberId}"}`;
      systemPrompt += `\nNEVER call these tools without the memberId parameter!`;
    }

    // Get AI model
    const model = getModel(supportBot.model);

    // Build tools for the support bot
    const tools = buildSupportTools(supportBot.availableTools);
    console.log(`Built ${tools.length} tools for support bot`);

    const modelWithTools = tools.length > 0 ? model.bindTools(tools) : model;

    // Convert messages to LangChain format
    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((msg: any) => ({
        role: msg.role === "ai" ? "assistant" : "user",
        content: msg.content,
      })),
    ];

    // Stream response using LangChain
    const stream = await modelWithTools.stream(chatMessages, {
      temperature: supportBot.temperature / 100,
    });

    // Create streaming response
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = "";
          let toolCalls = [];
          let currentToolCall = null;

          for await (const chunk of stream) {
            // Handle text content
            if (chunk.content) {
              fullResponse += chunk.content;
              const data = JSON.stringify({
                content: chunk.content,
                ...(activatedTrigger && { trigger: activatedTrigger.name }),
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }

            // Handle tool calls
            if (chunk.tool_calls && chunk.tool_calls.length > 0) {
              for (const toolCall of chunk.tool_calls) {
                if (toolCall.type === 'tool_call') {
                  console.log(`Tool call received: ${toolCall.name} with args:`, toolCall.args);
                  currentToolCall = {
                    id: toolCall.id,
                    name: toolCall.name,
                    args: toolCall.args
                  };
                  toolCalls.push(currentToolCall);
                }
              }
            }
          }

          // If we have tool calls, execute them and get final response
          if (toolCalls.length > 0) {
            console.log(`Executing ${toolCalls.length} tool calls`);
            
            const toolResults = [];
            for (const toolCall of toolCalls) {
              try {
                // Find the tool function
                const tool = tools.find(t => t.name === toolCall.name);
                if (tool) {
                  console.log(`Executing tool: ${toolCall.name} with args:`, toolCall.args);
                  
                  // Add context for tools that need it
                  const context = {
                    locationId: params.id,
                    supportBotId: supportBot.id,
                    // Add other context as needed
                  };
                  
                  // Ensure member tools have memberId - inject testMemberId if missing
                  let args = { ...toolCall.args };
                  if (['get_member_status', 'get_member_billing', 'get_member_bookable_sessions'].includes(toolCall.name)) {
                    if (!args.memberId && testMemberId) {
                      console.log(`Injecting missing memberId: ${testMemberId} for tool: ${toolCall.name}`);
                      args.memberId = testMemberId;
                    }
                    
                    if (!args.memberId) {
                      throw new Error(`Tool ${toolCall.name} requires a memberId but none was provided`);
                    }
                  }
                  
                  // Use the proper LangChain tool invoke method with context as second parameter
                  const result = await tool.invoke(args, context);
                  toolResults.push({
                    tool_call_id: toolCall.id,
                    content: result
                  });
                  
                  console.log(`Tool ${toolCall.name} executed successfully`);
                } else {
                  console.error(`Tool not found: ${toolCall.name}`);
                  toolResults.push({
                    tool_call_id: toolCall.id,
                    content: `Error: Tool ${toolCall.name} not found`
                  });
                }
              } catch (error) {
                console.error(`Error executing tool ${toolCall.name}:`, error);
                toolResults.push({
                  tool_call_id: toolCall.id,
                  content: `Error executing tool: ${error.message}`
                });
              }
            }

            // Add tool results to messages and get final response
            const messagesWithTools = [
              ...chatMessages,
              {
                role: "assistant",
                content: fullResponse,
                tool_calls: toolCalls.map(tc => ({
                  id: tc.id,
                  type: "function",
                  function: { name: tc.name, arguments: JSON.stringify(tc.args) }
                }))
              },
              ...toolResults.map(result => ({
                role: "tool",
                content: result.content,
                tool_call_id: result.tool_call_id
              }))
            ];

            // Get final response from model
            const finalStream = await modelWithTools.stream(messagesWithTools, {
              temperature: supportBot.temperature / 100,
            });

            // Stream the final response
            for await (const chunk of finalStream) {
              if (chunk.content) {
                const data = JSON.stringify({
                  content: chunk.content,
                  ...(activatedTrigger && { trigger: activatedTrigger.name }),
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            }
          }

          // Send final completion signal
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Support chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to get test member context (simplified to avoid relation errors)
async function getTestMemberContext(memberId: string, locationId: string) {
  try {
    console.log(
      `Getting test member context for memberId: ${memberId}, locationId: ${locationId}`
    );

    // Simplified query to avoid complex relations
    const member = await db.query.members.findFirst({
      where: (m, { eq }) => eq(m.id, memberId),
    });

    if (!member) {
      console.log("Member not found, returning default test context");
      return {
        firstName: "Test",
        lastName: "Member",
        email: "test@example.com",
        type: "member" as const,
        supportMetadata: {},
      };
    }

    console.log(`Found member: ${member.firstName} ${member.lastName}`);
    return {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone,
      type: "member" as const,
      supportMetadata: {},
    };
  } catch (error) {
    console.error("Error getting test member context:", error);
    return {
      firstName: "Test",
      lastName: "Member",
      email: "test@example.com",
      type: "member" as const,
      supportMetadata: {},
    };
  }
}
