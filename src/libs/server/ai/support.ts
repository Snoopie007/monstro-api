import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "@/db/db";
import { supportTickets, supportConversations } from "@/db/schemas";
import { eq, and } from "drizzle-orm";

// Build system prompt for support bot
export function buildSupportPrompt(supportBot: any, contact: any): string {
  const persona = supportBot.persona;

  return `${supportBot.prompt}

${
  persona
    ? `
Persona Details:
- Name: ${persona.name}
- Response Style: ${persona.responseStyle}
- Personality Traits: ${persona.personalityTraits.join(", ")}
`
    : ""
}

Contact Context:
- Name: ${contact.firstName} ${contact.lastName}
- Type: ${contact.type}

Available Tools:
${supportBot.availableTools
  .map((tool: any) => `- ${tool.name}: ${tool.description}`)
  .join("\n")}

Instructions:
- Be helpful and professional
- Use the persona's response style if available
- Use available tools when appropriate to help the customer
- Create support tickets for issues that need tracking
- Offer to escalate to human agent when needed`;
}

// Process trigger matching
export function evaluateTriggers(message: string, triggers: any[]): any | null {
  const messageLower = message.toLowerCase();

  for (const trigger of triggers) {
    if (!trigger.isActive) continue;

    for (const phrase of trigger.triggerPhrases) {
      if (messageLower.includes(phrase.toLowerCase())) {
        return trigger;
      }
    }
  }

  return null;
}

// Get member subscription/package status (simplified to avoid relation errors)
export const getMemberStatus = tool(
  async ({ memberId }, context) => {
    const locationId = context?.locationId;

    try {
      console.log(
        `Getting member status for memberId: ${memberId}, locationId: ${locationId}`
      );

      // Simplified query without complex relations for now
      const member = await db.query.members.findFirst({
        where: (m, { eq }) => eq(m.id, memberId),
      });

      if (!member) {
        return "I couldn't find your membership information. Please contact support for assistance.";
      }

      // For now, return basic member info - we'll enhance this once relations are stable
      let response = `Here's your current membership status:\n\n`;
      response += `**Member Information:**\n`;
      response += `• Name: ${member.firstName} ${member.lastName}\n`;
      response += `• Email: ${member.email}\n`;
      response += `• Member since: ${member.created.toLocaleDateString()}\n\n`;

      // TODO: Add subscription and package queries once relations are fixed
      response += `*For detailed subscription and package information, please contact our support team.*`;

      return response;
    } catch (error) {
      console.error("Error getting member status:", error);
      return "I encountered an error retrieving your membership information. Please contact support for assistance.";
    }
  },
  {
    name: "get_member_status",
    description: "Get member subscription and package status information",
    schema: z.object({
      memberId: z.string().describe("The member ID to look up"),
    }),
  }
);

// Get member billing information
export const getMemberBilling = tool(
  async ({ memberId }, context) => {
    const locationId = context?.locationId;

    try {
      // Get member's billing info and recent transactions
      const billingInfo = await db.query.memberLocations.findFirst({
        where: (ml, { eq, and }) =>
          and(eq(ml.memberId, memberId), eq(ml.locationId, locationId)),
        with: {
          member: {
            with: {
              paymentMethods: {
                where: (pm, { eq }) => eq(pm.isDefault, true),
              },
              transactions: {
                orderBy: (t, { desc }) => desc(t.createdAt),
                limit: 5,
                with: {
                  invoice: true,
                },
              },
            },
          },
        },
      });

      if (!billingInfo) {
        return "I couldn't find your billing information. Please contact support for assistance.";
      }

      const member = billingInfo.member;
      let response = "Here's your billing information:\n\n";

      // Payment method info
      if (member.paymentMethods.length > 0) {
        const defaultMethod = member.paymentMethods[0];
        response += `**Default Payment Method:**\n`;
        response += `• ${defaultMethod.type} ending in ${defaultMethod.last4}\n`;
        response += `• Expires: ${defaultMethod.expiryMonth}/${defaultMethod.expiryYear}\n\n`;
      }

      // Recent transactions
      if (member.transactions.length > 0) {
        response += "**Recent Transactions:**\n";
        member.transactions.forEach((txn) => {
          response += `• ${txn.createdAt.toLocaleDateString()} - $${
            txn.amount
          } (${txn.status})\n`;
          if (txn.invoice) {
            response += `  Invoice: ${txn.invoice.number}\n`;
          }
        });
      }

      return response;
    } catch (error) {
      console.error("Error getting member billing:", error);
      return "I encountered an error retrieving your billing information. Please contact support for assistance.";
    }
  },
  {
    name: "get_member_billing",
    description: "Get member billing and payment information",
    schema: z.object({
      memberId: z.string().describe("The member ID to look up"),
    }),
  }
);

// Get member's bookable sessions/classes
export const getMemberBookableSessions = tool(
  async ({ memberId }, context) => {
    const locationId = context?.locationId;

    try {
      // Get member's available classes based on subscriptions and packages
      const memberAccess = await db.query.memberLocations.findFirst({
        where: (ml, { eq, and }) =>
          and(eq(ml.memberId, memberId), eq(ml.locationId, locationId)),
        with: {
          member: {
            with: {
              memberSubscriptions: {
                where: (ms, { eq }) => eq(ms.status, "active"),
                with: {
                  subscription: {
                    with: {
                      subscriptionClasses: {
                        with: {
                          class: true,
                        },
                      },
                    },
                  },
                },
              },
              memberPackages: {
                where: (mp, { gt }) => gt(mp.remainingCredits, 0),
                with: {
                  package: {
                    with: {
                      packageClasses: {
                        with: {
                          class: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!memberAccess) {
        return "I couldn't find your membership information. Please contact support for assistance.";
      }

      const member = memberAccess.member;
      let availableClasses = new Set();
      let response = "Here are the classes you can book:\n\n";

      // Classes from active subscriptions
      member.memberSubscriptions.forEach((sub) => {
        sub.subscription.subscriptionClasses.forEach((sc) => {
          availableClasses.add(
            JSON.stringify({
              name: sc.class.name,
              description: sc.class.description,
              duration: sc.class.duration,
              source: "subscription",
            })
          );
        });
      });

      // Classes from packages with credits
      member.memberPackages.forEach((pkg) => {
        pkg.package.packageClasses.forEach((pc) => {
          availableClasses.add(
            JSON.stringify({
              name: pc.class.name,
              description: pc.class.description,
              duration: pc.class.duration,
              source: "package",
              creditsRequired: pc.creditsRequired || 1,
            })
          );
        });
      });

      if (availableClasses.size === 0) {
        return "You don't currently have access to any bookable classes. Consider purchasing a subscription or package to access our classes.";
      }

      const classesArray = Array.from(availableClasses).map((c) =>
        JSON.parse(c)
      );

      // Group by source
      const subscriptionClasses = classesArray.filter(
        (c) => c.source === "subscription"
      );
      const packageClasses = classesArray.filter((c) => c.source === "package");

      if (subscriptionClasses.length > 0) {
        response += "**Included in your subscription:**\n";
        subscriptionClasses.forEach((cls) => {
          response += `• ${cls.name} (${cls.duration} min)\n`;
          if (cls.description) response += `  ${cls.description}\n`;
        });
      }

      if (packageClasses.length > 0) {
        response += "\n**Available with your packages:**\n";
        packageClasses.forEach((cls) => {
          response += `• ${cls.name} (${cls.duration} min) - ${cls.creditsRequired} credit(s)\n`;
          if (cls.description) response += `  ${cls.description}\n`;
        });
      }

      response +=
        "\nTo book a session, please use our booking system or ask me to help you find available times!";

      return response;
    } catch (error) {
      console.error("Error getting member bookable sessions:", error);
      return "I encountered an error retrieving your available classes. Please contact support for assistance.";
    }
  },
  {
    name: "get_member_bookable_sessions",
    description:
      "Get classes and sessions the member can book based on their subscriptions and packages",
    schema: z.object({
      memberId: z.string().describe("The member ID to look up"),
    }),
  }
);

// Knowledge base search tool (for general questions)
export const searchKnowledge = tool(
  async ({ query }, context) => {
    const supportBotId = context?.supportBotId;

    try {
      // Simple text search in document chunks
      const chunks = await db.query.supportDocumentChunks.findMany({
        where: (chunks, { ilike, and, eq }) =>
          and(
            ilike(chunks.content, `%${query}%`),
            eq(chunks.document.supportBotId, supportBotId)
          ),
        limit: 3,
      });

      if (chunks.length === 0) {
        return "I couldn't find specific information about that in our knowledge base. Let me help you with your membership details or connect you with a human agent.";
      }

      return `Based on our knowledge base: ${chunks
        .map((c) => c.content)
        .join("\n\n")}`;
    } catch (error) {
      console.error("Error searching knowledge base:", error);
      return "I encountered an error searching our knowledge base. Please contact support for assistance.";
    }
  },
  {
    name: "search_knowledge",
    description:
      "Search the knowledge base for general facility and policy information",
    schema: z.object({
      query: z.string().describe("Search query for the knowledge base"),
    }),
  }
);

// Escalate to human tool
export const escalateToHuman = tool(
  async ({ reason, urgency }, context) => {
    const conversationId = context?.conversationId;

    try {
      // Mark conversation for human takeover
      await db
        .update(supportConversations)
        .set({
          isVendorActive: false,
          metadata: {
            escalationReason: reason,
            urgency,
            escalatedAt: new Date(),
          },
        })
        .where(eq(supportConversations.id, conversationId));

      return `I've escalated your request to our support team. A human agent will be with you shortly to help with: ${reason}`;
    } catch (error) {
      console.error("Error escalating to human:", error);
      return "I encountered an error trying to escalate your request. Please contact support directly for immediate assistance.";
    }
  },
  {
    name: "escalate_to_human",
    description:
      "Escalate the conversation to a human agent when the bot cannot help",
    schema: z.object({
      reason: z.string().describe("Reason for escalation"),
      urgency: z.enum(["low", "medium", "high"]).describe("Urgency level"),
    }),
  }
);

// Create support ticket tool
export const createSupportTicket = tool(
  async ({ title, description, priority }, context) => {
    const conversationId = context?.conversationId;

    try {
      const ticket = await db
        .insert(supportTickets)
        .values({
          conversationId,
          title,
          description,
          priority,
          status: "open",
        })
        .returning();

      return `Support ticket #${ticket[0].id} created successfully. I'll track this issue for you.`;
    } catch (error) {
      console.error("Error creating support ticket:", error);
      return "I encountered an error creating your support ticket. Please contact support directly for assistance.";
    }
  },
  {
    name: "create_support_ticket",
    description: "Create a support ticket for tracking customer issues",
    schema: z.object({
      title: z.string().describe("Brief title for the support ticket"),
      description: z.string().describe("Detailed description of the issue"),
      priority: z
        .number()
        .min(1)
        .max(3)
        .describe("Priority level: 1=high, 2=medium, 3=low"),
    }),
  }
);

// Update ticket status tool
export const updateTicketStatus = tool(
  async ({ ticketId, status, notes }) => {
    try {
      await db
        .update(supportTickets)
        .set({
          status,
          updatedAt: new Date(),
          metadata: { statusChangeNotes: notes },
        })
        .where(eq(supportTickets.id, ticketId));

      return `Ticket #${ticketId} status updated to ${status}`;
    } catch (error) {
      console.error("Error updating ticket status:", error);
      return "I encountered an error updating the ticket status. Please contact support for assistance.";
    }
  },
  {
    name: "update_ticket_status",
    description: "Update the status of a support ticket",
    schema: z.object({
      ticketId: z.string().describe("The ID of the ticket to update"),
      status: z
        .enum(["open", "in_progress", "resolved", "closed"])
        .describe("New status for the ticket"),
      notes: z
        .string()
        .optional()
        .describe("Additional notes about the status change"),
    }),
  }
);

// Build support tools array
export function buildSupportTools(availableTools: any[]) {
  const toolMap = {
    // Member-focused tools (corrected names to match database)
    get_member_status: getMemberStatus,
    get_member_billing: getMemberBilling,
    get_member_bookable_sessions: getMemberBookableSessions,

    // Ticket management tools
    create_support_ticket: createSupportTicket,
    update_ticket_status: updateTicketStatus,

    // General support tools
    search_knowledge_base: searchKnowledge,
    escalate_to_human: escalateToHuman,
  };

  console.log(
    "Available tools:",
    availableTools.map((t) => t.name)
  );
  console.log("Tool map keys:", Object.keys(toolMap));

  return availableTools
    .filter((t) => toolMap[t.name as keyof typeof toolMap])
    .map((t) => toolMap[t.name as keyof typeof toolMap]);
}
