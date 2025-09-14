export type SupportConversation = {
  id: string;
  supportAssistantId: string;
  memberId: string; // Required - only authenticated members
  locationId: string;
  category: string;
  takenOverAt?: Date;
  isVendorActive: boolean;
  title?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date | null;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

export type SupportMessage = {
  id: string;
  conversationId: string;
  content: string;
  role:
    | "user"
    | "assistant"
    | "staff"
    | "system"
    | "tool"
    | "developer"
    | "tool_result"
    | "tool_response"
    | "tool_message"
    | "agent";
  channel: "WebChat" | "Email" | "System";
  agentId?: string;
  agentName?: string;
  metadata: Record<string, any>;
  createdAt: Date;
};

export type MessageRole =
  | "user"
  | "assistant"
  | "staff"
  | "system"
  | "tool"
  | "developer"
  | "tool_result"
  | "tool_response"
  | "tool_message"
  | "agent";
export type Channel = "WebChat" | "Email" | "System";
