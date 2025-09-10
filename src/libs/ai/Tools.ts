



export interface SupportTool {
    name: string;
    description: string;
    parameters?: Record<string, any>;
    category?: string;
}




// Default tool definitions for support bots
export const DEFAULT_SUPPORT_TOOLS: SupportTool[] = [

    {
        name: "GetMemberBilling",
        description: "Get member billing and payment information including payment methods, transaction history, and upcoming payments",
        category: "member_info",
        parameters: {
            type: "object",
            properties: {
                memberId: {
                    type: "string",
                    description: "The member ID to look up (automatically provided from session)",
                },
            },
            required: ["memberId"],
        },
    },
    {
        name: "GetMemberSessions",
        description: "Get classes and sessions the member can book based on their active subscriptions and available packages",
        category: "member_info",
        parameters: {
            type: "object",
            properties: {
                memberId: {
                    type: "string",
                    description: "The member ID to look up (automatically provided from session)",
                },
            },
            required: ["memberId"],
        },
    },

    {
        name: "SearchKnowledgeBase",
        description: "Search the knowledge base for general facility information, policies, and frequently asked questions",
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
        name: "EscalateToHuman",
        description: "When member requests to speak to a human or human agent, trigger this tool.",
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