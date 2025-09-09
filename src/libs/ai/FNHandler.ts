import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { db } from '@/db/db';
import { eq } from 'drizzle-orm';
import { addDays, format, isSameDay } from "date-fns"
import { ToolMessage } from "@langchain/core/messages";
import { supportConversations } from '@/db/schemas';

type ToolCall = {
  id?: string;
  name: string;
  args: Record<string, any>;
  type?: 'tool_call';
}


async function EscalateToHuman(toolCall: ToolCall) {

  const { args } = toolCall;

  let completed = true;
  let content = ""

  try {
    // Mark conversation for human takeover
    await db.update(supportConversations).set({
      isVendorActive: false,

    }).where(eq(supportConversations.id, toolCall.args.cid));
  } catch (error) {

  }

  //Noify Vendor

  const newToolMessage = new ToolMessage({
    content,
    tool_call_id: toolCall.id!,
    name: toolCall.name
  })

  return {
    message: newToolMessage,

  }
}




async function RAGTool(toolCall: ToolCall) {
  // if (toolCall.name !== "RAGTool") {
  //     throw new Error("Invalid tool.")
  // }

  // const { type, query } = toolCall.args;

  // return {
  //     message: new ToolMessage({
  //         content: data,
  //         tool_call_id: toolCall.id!,
  //         name: toolCall.name
  //     }),
  //     next
  // }
}


function formatDate(date: string) {
  const slot = new Date(date);
  const today = new Date();
  const tomorrow = addDays(today, 1);

  let formattedDate;
  if (isSameDay(slot, tomorrow)) {
    formattedDate = `Tomorrow ${format(slot, 'h:mm a')}`;
  } else {
    formattedDate = format(slot, 'EEEE h:mm a');
  }

  return `${date} - ${formattedDate}`;
}



// Escalate to human tool
export const escalateToHuman = tool(
  async (input: any, context?: any) => {
    const { reason, urgency = "medium" } = input;
    const conversationId = context?.conversationId;

    try {
      console.log(`🚨 Escalating conversation ${conversationId} to human: ${reason}`);



      return `I've escalated your request to our support team. A human agent will be with you shortly to help with: ${reason}`;
    } catch (error) {
      console.error("Error escalating to human:", error);
      return "I encountered an error trying to escalate your request. Please contact support directly for immediate assistance.";
    }
  },
  {
    name: "escalate_to_human",
    description: "Escalate the conversation to a human agent when the bot cannot help",
    schema: z.object({
      reason: z.string().describe("Reason for escalation"),
      urgency: z
        .enum(["low", "medium", "high"])
        .default("medium")
        .describe("Urgency level"),
    }),
  }
);

// Knowledge base search tool (placeholder)
export const searchKnowledgeBase = tool(
  async (input: any, context?: any) => {
    const { query } = input;
    const supportBotId = context?.supportBotId;

    try {
      console.log(`📚 Searching knowledge base for: "${query}" in bot: ${supportBotId}`);


      return `I searched our knowledge base for "${query}" but the knowledge base system is not yet fully configured. Let me help you with your membership details or connect you with a human agent for specific facility information.`;
    } catch (error) {
      console.error("Error searching knowledge base:", error);
      return "I encountered an error searching our knowledge base. Please contact support for assistance.";
    }
  },
  {
    name: "search_knowledge_base",
    description: "Search the knowledge base for general facility and policy information",
    schema: z.object({
      query: z.string().describe("Search query for the knowledge base"),
    }),
  }
);


const Tools = {

}