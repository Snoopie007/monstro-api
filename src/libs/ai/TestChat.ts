import type { TestChatMessage, TestChatSession } from "@/types";
import { ToolFunctions } from "./FNHandler";
import { AIMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";
import type { Runnable } from "@langchain/core/runnables";

export async function addMessageToSession(
    sessionKey: string,
    message: TestChatMessage,
    redis: any
  ): Promise<void> {
    try {
      const session: TestChatSession | null = await redis.get(sessionKey);
      if (session) {
        session.messages.push(message);
        session.lastActivity = Date.now();
        await redis.setex(sessionKey, 7200, session); // 2 hour expiration
      }
    } catch (error) {
      console.error("Error adding message to session:", error);
    }
  }


  export async function invokeTestBot(
    model: Runnable,
    history: BaseMessage[],
    conversation: any,
    ml: any,
    sessionKey: string,
    redis: any
  ): Promise<TestChatMessage> {
    const res = await model.invoke({ history: history });
    let completed = true;
    let responseMessage: TestChatMessage = {
      role: "ai",
      content: res.content.toString(),
      timestamp: Date.now(),
    };
  
    // If there are tool calls, handle them
    if (res.tool_calls?.length) {
      responseMessage.tool_calls = res.tool_calls;
  
      for (const toolCall of res.tool_calls) {
        console.log("🔧 Processing test tool call:", toolCall.name);
  
        // Add tool call message to session
        await addMessageToSession(
          sessionKey,
          {
            role: "ai",
            content: res.content.toString(),
            timestamp: Date.now(),
            tool_calls: res.tool_calls,
          },
          redis
        );
  
        const tool = ToolFunctions[toolCall.name as keyof typeof ToolFunctions];
  
        if (toolCall.name !== "EscalateToHuman") {
          history.push(
            new AIMessage({
              content: res.content.toString(),
              tool_calls: res.tool_calls,
            })
          );
        }
  
        const data = await tool(toolCall, {
          conversation,
          ml,
        });
  
        const toolResponse: TestChatMessage = {
          role: "tool",
          content: data.content || "Tool executed successfully",
          timestamp: Date.now(),
          tool_call_id: toolCall.id,
          metadata: {
            tool_call_id: toolCall.id,
            tool_name: toolCall.name,
            tool_args: toolCall.args,
          },
        };
  
        // Add tool response to session
        await addMessageToSession(sessionKey, toolResponse, redis);
  
        if (data.role === "ai") {
          responseMessage = {
            role: "ai",
            content: data.content,
            timestamp: Date.now(),
          };
        } else {
          history.push(
            new ToolMessage({
              content: toolResponse.content,
              tool_call_id: toolCall.id,
              name: toolCall.name,
            })
          );
        }
        completed = data.completed;
      }
    }
  
    // Add final AI response to session
    await addMessageToSession(sessionKey, responseMessage, redis);
  
    if (completed) {
      console.log("🟢 Test bot response completed");
      return responseMessage;
    }
  
    // Recursive call if not completed
    return await invokeTestBot(
      model,
      history,
      conversation,
      ml,
      sessionKey,
      redis
    );
  }