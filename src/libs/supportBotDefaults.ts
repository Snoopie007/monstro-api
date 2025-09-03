/**
 * Default tool definitions for support bots
 * These tools are automatically available in every support bot
 */

export interface SupportTool {
  name: string;
  description: string;
  parameters?: Record<string, any>;
  category?: string;
}

export const DEFAULT_SUPPORT_TOOLS: SupportTool[] = [
  {
    name: "get_member_status",
    description:
      "Get member subscription and package status information including active subscriptions, available packages, and membership details",
    category: "member_info",
    parameters: {
      type: "object",
      properties: {
        memberId: {
          type: "string",
          description:
            "The member ID to look up (automatically provided from session)",
        },
      },
      required: ["memberId"],
    },
  },
  {
    name: "get_member_billing",
    description:
      "Get member billing and payment information including payment methods, transaction history, and upcoming payments",
    category: "member_info",
    parameters: {
      type: "object",
      properties: {
        memberId: {
          type: "string",
          description:
            "The member ID to look up (automatically provided from session)",
        },
      },
      required: ["memberId"],
    },
  },
  {
    name: "get_member_bookable_sessions",
    description:
      "Get classes and sessions the member can book based on their active subscriptions and available packages",
    category: "member_info",
    parameters: {
      type: "object",
      properties: {
        memberId: {
          type: "string",
          description:
            "The member ID to look up (automatically provided from session)",
        },
      },
      required: ["memberId"],
    },
  },
  {
    name: "create_support_ticket",
    description:
      "Create a support ticket for tracking customer issues and requests",
    category: "support",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Brief title for the support ticket",
        },
        description: {
          type: "string",
          description: "Detailed description of the issue",
        },
        priority: {
          type: "number",
          minimum: 1,
          maximum: 3,
          description: "Priority level: 1=high, 2=medium, 3=low",
        },
      },
      required: ["title", "description"],
    },
  },
  {
    name: "search_knowledge_base",
    description:
      "Search the knowledge base for general facility information, policies, and frequently asked questions",
    category: "knowledge",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for the knowledge base",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "escalate_to_human",
    description:
      "Escalate the conversation to a human agent when the bot cannot help or when complex issues require human intervention",
    category: "support",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Reason for escalation",
        },
        urgency: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Urgency level of the escalation",
        },
      },
      required: ["reason", "urgency"],
    },
  },
];

/**
 * Get the default tools for a new support bot
 */
export function getDefaultSupportTools(): SupportTool[] {
  return [...DEFAULT_SUPPORT_TOOLS];
}

/**
 * Check if a tool is a default/core tool
 */
export function isDefaultTool(toolName: string): boolean {
  return DEFAULT_SUPPORT_TOOLS.some((tool) => tool.name === toolName);
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: string): SupportTool[] {
  return DEFAULT_SUPPORT_TOOLS.filter((tool) => tool.category === category);
}
