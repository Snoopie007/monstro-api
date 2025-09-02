// Unified support system types for the simplified bot approach

export type SupportContact = {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  type: "member"; // Only authenticated members supported
  supportMetadata?: Record<string, any>;
};

export type SupportSystemStatus = {
  isActive: boolean;
  lastHealthCheck: Date;
  activeConversations: number;
  totalTickets: number;
  resolvedTickets: number;
};

export type SupportBotConfig = {
  id: string;
  locationId: string;
  name: string;
  prompt: string;
  initialMessage: string;
  temperature: number;
  model: "anthropic" | "gpt" | "gemini";
  status: "Draft" | "Active" | "Paused";
  availableTools: string[];
  persona?: {
    name: string;
    image?: string;
    responseStyle: string;
    personalityTraits: string[];
  };
  triggers: SupportTriggerConfig[];
  documents: SupportDocumentInfo[];
};

export type SupportTriggerConfig = {
  id: string;
  name: string;
  triggerType: "keyword" | "intent" | "condition";
  triggerPhrases: string[];
  toolCall: {
    name: string;
    parameters: Record<string, any>;
  };
  examples: string[];
  requirements: string[];
  isActive: boolean;
};

export type SupportDocumentInfo = {
  id: string;
  name: string;
  type: "file" | "website";
  size?: number;
  createdAt: Date;
};

export type SupportChatSession = {
  sessionId: string;
  memberId: string; // Required authenticated member ID
  messages: Array<{
    id: string;
    content: string;
    role: "user" | "ai" | "vendor" | "system";
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;
  isVendorActive: boolean;
  vendorId?: string;
  member?: SupportContact; // Member info (renamed from contact)
};

export type VendorTakeoverRequest = {
  conversationId: string;
  reason: string;
  urgency: "low" | "medium" | "high";
  vendorId: string;
};
