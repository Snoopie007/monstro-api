



export interface SupportTool {
    name: string;
    description: string;
    parameters?: Record<string, any>;
    category?: string;
}




// Default tool definitions for support bots
export const DEFAULT_SUPPORT_TOOLS: SupportTool[] = [

    // {
    //     name: "GetMemberBilling",
    //     description: "When member requests billing information, trigger this tool.",
    //     parameters: {
    //         type: "object",
    //         properties: {
    //             planId: {
    //                 type: "string",
    //                 description: "Plan ID to get billing information for",
    //             },
    //         },
    //         required: ["planId"],
    //     },
    // },
    {
        name: "GetMemberSessions",
        description: "Get classes and sessions the member can book based on their active subscriptions and available packages",

    },
    {
        name: "GetMemberPlans",
        description: "When member requests plans information, trigger this tool.",
    },

    {
        name: "SearchKnowledgeBase",
        description: "Search the knowledge base for general facility information, policies, and frequently asked questions",

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