// =====================================================================
// Mock Data for Bot System Testing
// =====================================================================
// This file contains mock data for testing the bot functionality
// during the migration from monstro-bots to monstro-15

import type {
  Bot,
  BotTemplate,
  AIPersona,
  Document,
  BotScenario,
  UnifiedContact,
  Message,
  ExtendedBot,
} from "@/types/bots";

// =====================================================================
// Mock Bot Templates
// =====================================================================

export const MOCK_BOT_TEMPLATES: BotTemplate[] = [
  {
    id: "template-1",
    name: "Front Desk Assistant",
    description:
      "A professional assistant for handling general inquiries and directing customers",
    prompt:
      "You are a professional front desk assistant for a fitness center. Be helpful, concise, and direct members to appropriate resources. Always maintain a professional tone and provide accurate information about gym facilities, hours, and policies.",
    responseDetails:
      "Professional and concise responses focusing on practical help",
    model: "gpt",
    initialMessage:
      "Hello! I'm your virtual front desk assistant. How can I help you today?",
    invalidNodes: [],
    objectives: [
      {
        label: "Greet Customer",
        goal: "Provide a warm professional greeting",
        paths: { next: "assess_need" },
        instructions: "Be welcoming and ask how you can help",
      },
      {
        label: "Assess Need",
        goal: "Understand what the customer needs",
        paths: {
          membership: "membership_info",
          facilities: "facility_info",
          hours: "hours_info",
        },
        instructions:
          "Ask clarifying questions to understand their specific need",
      },
    ],
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-20"),
  },
  {
    id: "template-2",
    name: "Sales Concierge",
    description:
      "A friendly sales-oriented assistant focused on converting leads to members",
    prompt:
      "You are a sales concierge for a fitness center. Be friendly, enthusiastic, and guide potential customers towards membership packages. Focus on benefits, value, and creating urgency. Always ask for contact information and offer tours.",
    responseDetails:
      "Friendly and engaging responses that highlight benefits and value",
    model: "gpt",
    initialMessage:
      "Hi there! Welcome to our fitness center. I'd love to help you find the perfect membership package that fits your fitness goals!",
    invalidNodes: [],
    objectives: [
      {
        label: "Welcome Prospect",
        goal: "Create enthusiasm about fitness center",
        paths: { next: "discover_goals" },
        instructions: "Be energetic and highlight what makes the gym special",
      },
      {
        label: "Discover Goals",
        goal: "Learn about their fitness goals and preferences",
        paths: {
          weight_loss: "weight_loss_packages",
          strength: "strength_packages",
          general: "general_packages",
        },
        instructions:
          "Ask about their fitness goals, experience level, and preferences",
      },
    ],
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-20"),
  },
  {
    id: "template-3",
    name: "Wellness Coach",
    description:
      "A motivational coach providing general fitness guidance and encouragement",
    prompt:
      "You are a motivational wellness coach AI assistant. Provide encouragement, general fitness tips, and wellness advice. Always remind users to consult with professional trainers for specific workout plans. Be positive, supportive, and inspiring.",
    responseDetails:
      "Encouraging and motivational responses with general wellness advice",
    model: "anthropic",
    initialMessage:
      "Hey there, fitness champion! I'm here to support your wellness journey. What are your goals today?",
    invalidNodes: [],
    objectives: [
      {
        label: "Motivate User",
        goal: "Provide encouragement and motivation",
        paths: { next: "assess_wellness_goal" },
        instructions:
          "Be energetic and supportive, ask about their wellness journey",
      },
      {
        label: "Wellness Assessment",
        goal: "Understand their current fitness level and goals",
        paths: {
          beginner: "beginner_advice",
          intermediate: "intermediate_advice",
          advanced: "advanced_advice",
        },
        instructions:
          "Ask about experience level, current challenges, and specific goals",
      },
    ],
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-20"),
  },
];

// =====================================================================
// Mock AI Personas
// =====================================================================

export const MOCK_AI_PERSONAS: AIPersona[] = [
  {
    id: "persona-1",
    locationId: "loc-1",
    name: "Alex - Professional Assistant",
    image: "/images/personas/alex.png",
    responseDetails: "Professional, helpful, and efficient communication style",
    personality: ["Professional", "Helpful", "Efficient", "Knowledgeable"],
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "persona-2",
    locationId: "loc-1",
    name: "Sam - Friendly Sales Rep",
    image: "/images/personas/sam.png",
    responseDetails:
      "Friendly, enthusiastic, and persuasive communication style",
    personality: ["Friendly", "Enthusiastic", "Persuasive", "Goal-oriented"],
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "persona-3",
    locationId: "loc-1",
    name: "Casey - Wellness Coach",
    image: "/images/personas/casey.png",
    responseDetails:
      "Motivational, supportive, and encouraging communication style",
    personality: ["Motivational", "Supportive", "Encouraging", "Positive"],
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-15"),
  },
];

// =====================================================================
// Mock Bots
// =====================================================================

export const MOCK_BOTS: Bot[] = [
  {
    id: "bot-1",
    locationId: "loc-1",
    name: "Front Desk Helper",
    initialMessage:
      "Hi! I'm here to help with any questions about our facility, hours, or services. What would you like to know?",
    prompt:
      "You are a helpful front desk assistant for a fitness center. Answer questions about facilities, hours, membership, and general information. Be professional but friendly.",
    objectives: [
      {
        label: "Greet and Assess",
        goal: "Welcome the user and understand their need",
        paths: {
          membership: "membership_flow",
          facilities: "facility_flow",
          general: "general_help",
        },
        instructions: "Ask how you can help and categorize their need",
      },
    ],
    temperature: 50,
    model: "gpt",
    invalidNodes: [],
    status: "Active",
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-25"),
  },
  {
    id: "bot-2",
    locationId: "loc-1",
    name: "Sales Assistant",
    initialMessage:
      "Welcome! I'm excited to help you find the perfect membership plan that fits your fitness goals. Let's get started!",
    prompt:
      "You are a sales-focused assistant for a fitness center. Your goal is to convert prospects to members by understanding their needs and presenting appropriate membership options.",
    objectives: [
      {
        label: "Qualify Lead",
        goal: "Understand their fitness goals and budget",
        paths: { serious: "present_options", browsing: "build_interest" },
        instructions:
          "Ask about their goals, experience, and what they're looking for",
      },
    ],
    temperature: 70,
    model: "gpt",
    invalidNodes: [],
    status: "Active",
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-25"),
  },
  {
    id: "bot-3",
    locationId: "loc-1",
    name: "Wellness Coach Bot",
    initialMessage:
      "Hey there! I'm your personal wellness coach. I'm here to motivate you and help with general fitness advice. What's on your mind today?",
    prompt:
      "You are a motivational wellness coach. Provide encouragement, general fitness tips, and wellness guidance. Always recommend consulting with professional trainers for specific programs.",
    objectives: [
      {
        label: "Motivate and Support",
        goal: "Provide encouragement and general guidance",
        paths: {
          nutrition: "nutrition_tips",
          workout: "workout_guidance",
          motivation: "motivational_support",
        },
        instructions: "Be encouraging and provide general wellness advice",
      },
    ],
    temperature: 80,
    model: "anthropic",
    invalidNodes: [],
    status: "Draft",
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-25"),
  },
];

// =====================================================================
// Mock Bot Scenarios
// =====================================================================

export const MOCK_BOT_SCENARIOS: BotScenario[] = [
  {
    id: "scenario-1",
    name: "Membership Inquiry",
    botId: "bot-1",
    workflowId: null,
    routineId: null,
    trigger: "membership",
    examples: [
      "I want to know about membership prices",
      "What membership options do you have?",
      "How much does it cost to join?",
      "Tell me about your membership plans",
    ],
    requirements: [],
    yield: false,
    createdAt: new Date("2024-01-21"),
    updatedAt: new Date("2024-01-22"),
  },
  {
    id: "scenario-2",
    name: "Facility Tour Request",
    botId: "bot-1",
    workflowId: null,
    routineId: null,
    trigger: "tour",
    examples: [
      "Can I get a tour of the facility?",
      "I'd like to see the gym",
      "What does your gym look like?",
      "Can you show me around?",
    ],
    requirements: [],
    yield: false,
    createdAt: new Date("2024-01-21"),
    updatedAt: new Date("2024-01-22"),
  },
  {
    id: "scenario-3",
    name: "Contact Information Collection",
    botId: "bot-2",
    workflowId: null,
    routineId: null,
    trigger: "contact_info",
    examples: [
      "I'm interested in joining",
      "I want to sign up",
      "How do I become a member?",
      "I'd like to join your gym",
    ],
    requirements: ["email", "phone"],
    yield: true,
    createdAt: new Date("2024-01-21"),
    updatedAt: new Date("2024-01-22"),
  },
];

// =====================================================================
// Mock Documents (Knowledge Base)
// =====================================================================

export const MOCK_DOCUMENTS: Document[] = [
  {
    id: "doc-1",
    name: "Membership Guidelines.pdf",
    filePath: "/uploads/membership-guidelines.pdf",
    url: null,
    type: "file",
    locationId: "loc-1",
    size: 2048000, // 2MB
    createdAt: new Date("2024-01-18"),
  },
  {
    id: "doc-2",
    name: "Facility Rules & Policies.pdf",
    filePath: "/uploads/facility-rules.pdf",
    url: null,
    type: "file",
    locationId: "loc-1",
    size: 1536000, // 1.5MB
    createdAt: new Date("2024-01-18"),
  },
  {
    id: "doc-3",
    name: "Class Schedules & Descriptions.pdf",
    filePath: "/uploads/class-schedules.pdf",
    url: null,
    type: "file",
    locationId: "loc-1",
    size: 1024000, // 1MB
    createdAt: new Date("2024-01-19"),
  },
  {
    id: "doc-4",
    name: "Website Content",
    filePath: null,
    url: "https://example-gym.com",
    type: "website",
    locationId: "loc-1",
    size: null,
    createdAt: new Date("2024-01-19"),
  },
];

// =====================================================================
// Mock Extended Bots (with relationships)
// =====================================================================

export const MOCK_EXTENDED_BOTS: ExtendedBot[] = MOCK_BOTS.map((bot) => ({
  ...bot,
  scenarios: MOCK_BOT_SCENARIOS.filter((scenario) => scenario.botId === bot.id),
  knowledge: MOCK_DOCUMENTS.slice(0, 2), // First 2 documents for each bot
  botKnowledge: [
    { botId: bot.id, documentId: "doc-1" },
    { botId: bot.id, documentId: "doc-2" },
  ],
  botPersona: [{ botId: bot.id, personaId: "persona-1" }],
  persona: MOCK_AI_PERSONAS.filter((persona) => persona.id === "persona-1"),
}));

// =====================================================================
// Mock Unified Contacts (Members + Guests)
// =====================================================================

export const MOCK_UNIFIED_CONTACTS: UnifiedContact[] = [
  {
    id: "member-1",
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@email.com",
    phone: "+1-555-0123",
    type: "member",
    botMetadata: {
      preferredTime: "morning",
      fitnessGoal: "weight_loss",
      lastInteraction: "2024-01-25T10:00:00Z",
    },
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "member-2",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@email.com",
    phone: "+1-555-0124",
    type: "member",
    botMetadata: {
      preferredTime: "evening",
      fitnessGoal: "strength_training",
      lastInteraction: "2024-01-24T18:00:00Z",
    },
    createdAt: new Date("2024-01-05"),
  },
  {
    id: "guest-1",
    firstName: "Mike",
    lastName: "Davis",
    email: "mike.davis@email.com",
    phone: "+1-555-0125",
    type: "guest",
    botMetadata: {
      inquiryType: "membership",
      leadSource: "website",
      interactionCount: 3,
    },
    createdAt: new Date("2024-01-23"),
  },
  {
    id: "guest-2",
    firstName: "Lisa",
    lastName: "Chen",
    email: "lisa.chen@email.com",
    phone: null,
    type: "guest",
    botMetadata: {
      inquiryType: "tour_request",
      leadSource: "facebook",
      interactionCount: 1,
    },
    createdAt: new Date("2024-01-25"),
  },
];

// =====================================================================
// Mock Chat Messages
// =====================================================================

export const MOCK_CHAT_MESSAGES: Message[] = [
  {
    id: "msg-1",
    conversationId: "conv-1",
    content:
      "Hi! I'm here to help with any questions about our facility, hours, or services. What would you like to know?",
    role: "ai",
    channel: "WebChat",
    metadata: { botId: "bot-1", sessionId: "session-1" },
    createdAt: new Date("2024-01-25T10:00:00Z"),
  },
  {
    id: "msg-2",
    conversationId: "conv-1",
    content: "I'm interested in learning about your membership options",
    role: "user",
    channel: "WebChat",
    metadata: { contactId: "member-1" },
    createdAt: new Date("2024-01-25T10:01:00Z"),
  },
  {
    id: "msg-3",
    conversationId: "conv-1",
    content:
      "Great! I'd be happy to help you with our membership options. We have several plans designed to fit different needs and budgets. What are your main fitness goals?",
    role: "ai",
    channel: "WebChat",
    metadata: {
      botId: "bot-1",
      sessionId: "session-1",
      scenarioTriggered: "scenario-1",
    },
    createdAt: new Date("2024-01-25T10:01:30Z"),
  },
];

// =====================================================================
// Mock Functions for API Simulation
// =====================================================================

// Simulate API delay
export const simulateDelay = (ms: number = 1000) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Mock bot creation
export const createMockBot = async (
  locationId: string,
  botData: Partial<Bot>
): Promise<Bot> => {
  await simulateDelay(800);

  const newBot: Bot = {
    id: `bot-${Date.now()}`,
    locationId,
    name: botData.name || "New Bot",
    initialMessage: botData.initialMessage || null,
    prompt: botData.prompt || "",
    objectives: botData.objectives || [],
    temperature: botData.temperature || 50,
    model: botData.model || "gpt",
    invalidNodes: [],
    status: "Draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Add to mock data (in real app, this would be a database operation)
  MOCK_BOTS.push(newBot);

  return newBot;
};

// Mock bot update
export const updateMockBot = async (
  botId: string,
  updates: Partial<Bot>
): Promise<Bot> => {
  await simulateDelay(600);

  const botIndex = MOCK_BOTS.findIndex((bot) => bot.id === botId);
  if (botIndex === -1) {
    throw new Error("Bot not found");
  }

  const updatedBot = {
    ...MOCK_BOTS[botIndex],
    ...updates,
    updatedAt: new Date(),
  };

  MOCK_BOTS[botIndex] = updatedBot;
  return updatedBot;
};

// Mock bot deletion
export const deleteMockBot = async (botId: string): Promise<void> => {
  await simulateDelay(400);

  const botIndex = MOCK_BOTS.findIndex((bot) => bot.id === botId);
  if (botIndex === -1) {
    throw new Error("Bot not found");
  }

  MOCK_BOTS.splice(botIndex, 1);
};

// Mock scenario creation
export const createMockScenario = async (
  botId: string,
  scenarioData: Partial<BotScenario>
): Promise<BotScenario> => {
  await simulateDelay(600);

  const newScenario: BotScenario = {
    id: `scenario-${Date.now()}`,
    name: scenarioData.name || "New Scenario",
    botId,
    workflowId: null,
    routineId: null,
    trigger: scenarioData.trigger || "",
    examples: scenarioData.examples || [],
    requirements: scenarioData.requirements || [],
    yield: scenarioData.yield || false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  MOCK_BOT_SCENARIOS.push(newScenario);
  return newScenario;
};

// Mock chat response
export const generateMockChatResponse = async (
  message: string,
  botId: string
): Promise<string> => {
  await simulateDelay(1500);

  const bot = MOCK_BOTS.find((b) => b.id === botId);
  if (!bot) {
    throw new Error("Bot not found");
  }

  // Simple mock response generation based on message content
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("membership") || lowerMessage.includes("join")) {
    return "I'd be happy to help you with membership information! We offer several membership tiers including Basic ($29/month), Premium ($49/month), and Elite ($79/month). Each includes different access levels and benefits. Which would you like to know more about?";
  }

  if (lowerMessage.includes("hours") || lowerMessage.includes("open")) {
    return "Our facility is open Monday-Friday 5:00 AM to 11:00 PM, Saturday 6:00 AM to 10:00 PM, and Sunday 7:00 AM to 9:00 PM. Is there a specific time you're planning to visit?";
  }

  if (lowerMessage.includes("tour") || lowerMessage.includes("visit")) {
    return "I'd love to arrange a tour for you! Our facility features state-of-the-art equipment, group fitness studios, a pool, and locker rooms. Tours typically take 15-20 minutes. Would you prefer to schedule for a specific time or drop by during our open hours?";
  }

  if (lowerMessage.includes("class") || lowerMessage.includes("program")) {
    return "We offer a variety of group fitness classes including yoga, spinning, HIIT, strength training, and aqua fitness. Classes run throughout the day with different instructors. Would you like me to tell you about a specific type of class or our current schedule?";
  }

  // Default response
  return "Thank you for your message! I'm here to help with any questions about our facility, membership options, hours, classes, or services. What would you like to know more about?";
};
