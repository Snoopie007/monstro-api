import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { db } from '@/db/db';
import { eq, and, gt, desc } from 'drizzle-orm';
import { 
  members, 
  memberLocations, 
  supportConversations,
  ticketStatusEnum,
  TicketStatus
} from '@/db/schemas';

// Get member subscription/package status  
export const getMemberStatus = tool(
  async (input: any, context?: any) => {
    const { memberId } = input;
    const locationId = context?.locationId;

    try {
      console.log(
        `🔍 Getting member status for memberId: ${memberId}, locationId: ${locationId}`
      );

      // Get basic member info first
      const member = await db.query.members.findFirst({
        where: eq(members.id, memberId),
      });

      if (!member) {
        return "I couldn't find your membership information. Please contact support for assistance.";
      }

      let response = `Here's your current membership status:\n\n`;
      response += `**Member Information:**\n`;
      response += `• Name: ${member.firstName} ${member.lastName}\n`;
      response += `• Email: ${member.email}\n`;
      response += `• Member since: ${member.created.toLocaleDateString()}\n\n`;

      // TODO: Add subscription and package queries once relations are working
      try {
        // const memberLocation = await db.query.memberLocations.findFirst({
        //   where: and(
        //     eq(memberLocations.memberId, memberId),
        //     eq(memberLocations.locationId, locationId)
        //   ),
        //   with: {
        //     member: {
        //       with: {
        //         subscriptions: {
        //           with: { plan: true }
        //         },
        //         packages: {
        //           with: { plan: true }
        //         }
        //       }
        //     }
        //   }
        // });

        // if (memberLocation?.member) {
        //   if (memberLocation.member.subscriptions?.length > 0) {
        //     response += `**Active Subscriptions:**\n`;
        //     memberLocation.member.subscriptions.forEach(sub => {
        //       response += `• ${sub.plan?.name || 'Subscription'}\n`;
        //     });
        //   }

        //   if (memberLocation.member.packages?.length > 0) {
        //     response += `\n**Available Packages:**\n`;
        //     memberLocation.member.packages.forEach(pkg => {
        //       response += `• ${pkg.plan?.name || 'Package'} - ${pkg.remainingCredits || 0} credits remaining\n`;
        //     });
        //   }
        // }

        response += `*Detailed subscription and package information will be available once the database relations are fully configured.*`;
      } catch (relationError) {
        console.log("Relations not available yet, showing basic info only");
        response += `*For detailed subscription and package information, please contact our support team.*`;
      }

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
  async (input: any, context?: any) => {
    const { memberId } = input;
    const locationId = context?.locationId;

    try {
      console.log(`💳 Getting billing info for memberId: ${memberId}, locationId: ${locationId}`);

      // Get basic member info
      const member = await db.query.members.findFirst({
        where: eq(members.id, memberId),
      });

      if (!member) {
        return "I couldn't find your account information. Please contact support for assistance.";
      }

      let response = "Here's your account information:\n\n";
      response += `**Member Account:**\n`;
      response += `• Name: ${member.firstName} ${member.lastName}\n`;
      response += `• Email: ${member.email}\n`;
      if (member.stripeCustomerId) {
        response += `• Payment system: Connected\n`;
      }

      // TODO: Add payment methods and transactions when available
      // try {
      //   const billingInfo = await db.query.memberLocations.findFirst({
      //     where: and(
      //       eq(memberLocations.memberId, memberId),
      //       eq(memberLocations.locationId, locationId)
      //     ),
      //     with: {
      //       member: {
      //         with: {
      //           paymentMethods: {
      //             where: eq(paymentMethods.isDefault, true),
      //           },
      //           transactions: {
      //             orderBy: desc(transactions.createdAt),
      //             limit: 5,
      //             with: {
      //               invoice: true,
      //             },
      //           },
      //         },
      //       },
      //     },
      //   });

      //   if (billingInfo?.member.paymentMethods?.length > 0) {
      //     const defaultMethod = billingInfo.member.paymentMethods[0];
      //     response += `\n**Default Payment Method:**\n`;
      //     response += `• ${defaultMethod.type} ending in ${defaultMethod.last4}\n`;
      //     response += `• Expires: ${defaultMethod.expiryMonth}/${defaultMethod.expiryYear}\n`;
      //   }

      //   if (billingInfo?.member.transactions?.length > 0) {
      //     response += "\n**Recent Transactions:**\n";
      //     billingInfo.member.transactions.forEach((txn) => {
      //       response += `• ${txn.createdAt.toLocaleDateString()} - $${txn.amount} (${txn.status})\n`;
      //       if (txn.invoice) {
      //         response += `  Invoice: ${txn.invoice.number}\n`;
      //       }
      //     });
      //   }
      // } catch (relationError) {
      //   console.log("Billing relations not available");
      // }

      response += `\n*For detailed billing information and payment history, please contact our support team.*`;

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
  async (input: any, context?: any) => {
    const { memberId } = input;
    const locationId = context?.locationId;

    try {
      console.log(`📅 Getting bookable sessions for memberId: ${memberId}, locationId: ${locationId}`);

      const member = await db.query.members.findFirst({
        where: eq(members.id, memberId),
      });

      if (!member) {
        return "I couldn't find your membership information. Please contact support for assistance.";
      }

      let response = `Hello ${member.firstName}! Here's what I can help you with:\n\n`;
      response += "**Available Services:**\n";
      response += "• Check your current subscriptions and packages\n";
      response += "• View your billing information\n";
      response += "• Get general facility information\n";
      response += "• Create support tickets for specific issues\n\n";

      // TODO: Implement actual class lookup when relations are available
      // try {
      //   const memberAccess = await db.query.memberLocations.findFirst({
      //     where: and(
      //       eq(memberLocations.memberId, memberId),
      //       eq(memberLocations.locationId, locationId)
      //     ),
      //     with: {
      //       member: {
      //         with: {
      //           subscriptions: {
      //             with: { plan: true }
      //           },
      //           packages: {
      //             with: { plan: true }
      //           }
      //         }
      //       }
      //     }
      //   });

      //   if (memberAccess?.member) {
      //     if (memberAccess.member.subscriptions?.length > 0) {
      //       response += "**Included in your subscriptions:**\n";
      //       memberAccess.member.subscriptions.forEach((sub) => {
      //         response += `• ${sub.plan?.name || 'Subscription plan'}\n`;
      //       });
      //       response += "\n";
      //     }

      //     if (memberAccess.member.packages?.length > 0) {
      //       response += "**Available with your packages:**\n";
      //       memberAccess.member.packages.forEach((pkg) => {
      //         response += `• ${pkg.plan?.name || 'Package'} - ${pkg.remainingCredits || 0} credits remaining\n`;
      //       });
      //       response += "\n";
      //     }
      //   }
      // } catch (relationError) {
      //   console.log("Class relations not available");
      // }

      response += "*For specific class schedules and booking, please use our booking system or contact support.*";

      return response;
    } catch (error) {
      console.error("Error getting member bookable sessions:", error);
      return "I encountered an error retrieving your available classes. Please contact support for assistance.";
    }
  },
  {
    name: "get_member_bookable_sessions",
    description: "Get classes and sessions the member can book based on their subscriptions and packages",
    schema: z.object({
      memberId: z.string().describe("The member ID to look up"),
    }),
  }
);

// Create support ticket tool
export const createSupportTicket = tool(
  async (input: any, context?: any) => {
    const { title, description, priority = 3 } = input;
    const conversationId = context?.conversationId;

    try {
      console.log(`🎫 Creating support ticket for conversation: ${conversationId}`);

      const [conversation] = await db
        .update(supportConversations)
        .set({
          title,
          description,
          priority,
          status: TicketStatus.Open,
          updatedAt: new Date(),
        })
        .where(eq(supportConversations.id, conversationId))
        .returning();

      return `Support ticket "${title}" created successfully. I'll track this issue for you.`;
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
        .default(3)
        .describe("Priority level: 1=high, 2=medium, 3=low"),
    }),
  }
);

// Escalate to human tool
export const escalateToHuman = tool(
  async (input: any, context?: any) => {
    const { reason, urgency = "medium" } = input;
    const conversationId = context?.conversationId;

    try {
      console.log(`🚨 Escalating conversation ${conversationId} to human: ${reason}`);

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

      // TODO: Implement actual knowledge base search when documents are available
      // const chunks = await db.query.supportDocumentChunks.findMany({
      //   where: and(
      //     ilike(supportDocumentChunks.content, `%${query}%`),
      //     eq(supportDocuments.supportBotId, supportBotId)
      //   ),
      //   limit: 3,
      // });

      // if (chunks.length === 0) {
      //   return "I couldn't find specific information about that in our knowledge base. Let me help you with your membership details or connect you with a human agent.";
      // }

      // return `Based on our knowledge base:\n\n${chunks
      //   .map((c) => c.content)
      //   .join("\n\n")}`;

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

// Build support tools array
export function buildSupportTools(availableTools: any[]) {
  const toolMap = {
    // Member-focused tools
    get_member_status: getMemberStatus,
    get_member_billing: getMemberBilling,
    get_member_bookable_sessions: getMemberBookableSessions,

    // Ticket management tools
    create_support_ticket: createSupportTicket,

    // General support tools
    search_knowledge_base: searchKnowledgeBase,
    escalate_to_human: escalateToHuman,
  };

  console.log(
    "🔧 Available tools:",
    availableTools.map((t) => t.name)
  );
  console.log("🔧 Tool map keys:", Object.keys(toolMap));

  return availableTools
    .filter((t) => toolMap[t.name as keyof typeof toolMap])
    .map((t) => toolMap[t.name as keyof typeof toolMap]);
}
