
export const TOOLS_DEFINITIONS = [
    {
        type: "function",
        function: {
            name: "clarify",
            description: "Ask the user to pick one option after a lookup found several matches (members, class times, or payments). Do not use this for a greeting, to choose the task, or to ask for a first and last name.",
            parameters: {
                type: "object",
                properties: {
                    question: {
                        type: "string",
                        description: "Question to show the user",
                    },
                    options: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                label: { type: "string" },
                            },
                            required: ["id", "label"],
                        },
                    },
                },
                required: ["question", "options"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "ask",
            description: "Do not use this to ask for a member name or to choose a task. Only ask a free-text question when no other tool fits.",
            parameters: {
                type: "object",
                properties: {
                    question: {
                        type: "string",
                        description: "Question to show in the chat input",
                    },
                },
                required: ["question"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "retry_failed",
            description: "Start or continue retrying an unpaid subscription payment. Call this immediately when the user selects Retry Failed Payments. Pass name, memberId, and subscriptionId whenever they are known.",
            parameters: {
                type: "object",
                additionalProperties: false,
                properties: {
                    name: {
                        type: "string",
                        description: "Member first and last name when the user typed a name",
                    },
                    memberId: {
                        type: "string",
                        description: "Member id from a clarify chip, e.g. mbr_...",
                    },
                    subscriptionId: {
                        type: "string",
                        description: "Unpaid subscription id from a confirm chip the user already picked",
                    },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "cancel_session",
            description: "Start or continue cancelling one member session. Call this immediately when the user selects Cancel Session or asks to cancel a class. Pass name, memberId, program, time, reservationId, and refundClassCredit whenever they are known.",
            parameters: {
                type: "object",
                additionalProperties: false,
                properties: {
                    name: { type: "string", description: "Member first and last name when the user typed a name" },
                    memberId: { type: "string", description: "Member id from a clarify chip, e.g. mbr_..." },
                    program: { type: "string", description: "Class name the user typed, e.g. Crossfit. Match against reservation programName. Never an id." },
                    time: { type: "string", description: "Class time when the user named one, e.g. 5PM or 17:00. Omit when they did not." },
                    reservationId: { type: "string", description: "Reservation id from a session chip, or refund:/keep: from the confirm chip" },
                    refundClassCredit: { type: "boolean", description: "True to refund a package class or a term-plan class credit" },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "schedule_session",
            description: "Start or continue scheduling a member into a class. Call this immediately when the user selects Schedule a Session or asks to book someone. Pass name, memberId, program, programId, memberPlanId, time, and date whenever they are known.",
            parameters: {
                type: "object",
                additionalProperties: false,
                properties: {
                    name: {
                        type: "string",
                        description: "Member first and last name when the user typed a name",
                    },
                    memberId: {
                        type: "string",
                        description: "Member id from a clarify chip, e.g. mbr_...",
                    },
                    program: {
                        type: "string",
                        description: "Class name the user typed, e.g. BJJ or Yoga. Never an id.",
                    },
                    programId: {
                        type: "string",
                        description: "Program id only from a class chip the user already picked",
                    },
                    memberPlanId: {
                        type: "string",
                        description: "Member subscription or package id from a plan chip the user already picked",
                    },
                    time: {
                        type: "string",
                        description: "Class time when the user named one, e.g. 5PM or 17:00. Omit when they did not; the tool uses the only class that day or asks which time.",
                    },
                    date: {
                        type: "string",
                        description: "yyyy-MM-dd when the user named a day, converted using Today at this location. Omit when they did not name a date; the tool uses today.",
                    },
                    sessionId: {
                        type: "string",
                        description: "Session id from a time chip the user already picked",
                    },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "report",
            description: "Look up a location metric. Call this immediately for active members, revenue, average MRR, or top paying members. Do not clarify.",
            parameters: {
                type: "object",
                additionalProperties: false,
                properties: {
                    kind: {
                        type: "string",
                        enum: ["active_members", "monthly_revenue", "average_mrr", "top_payers"],
                        description: "active_members for the current count, monthly_revenue for paid transaction totals, average_mrr for average monthly subscription revenue, top_payers for the five members who paid the most",
                    },
                    range: {
                        type: "string",
                        description: "Time phrase for monthly_revenue and top_payers, such as this month, last month, last 6 months, or this year. Omit for this month. Ignored for active_members and average_mrr.",
                    },
                },
                required: ["kind"],
            },
        },
    },
];
