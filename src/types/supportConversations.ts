export type SupportConversation = {
  id: string;
  supportBotId: string;
  memberId: string; // Required - only authenticated members
  vendorId?: string;
  takenOverAt?: Date;
  isVendorActive: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date | null;
};

export type SupportMessage = {
  id: string;
  conversationId: string;
  content: string;
  role: "user" | "ai" | "vendor" | "system" | "tool" | "tool_response";
  channel: "WebChat" | "Email" | "System";
  metadata: Record<string, any>;
  createdAt: Date;
};

export type MessageRole =
  | "user"
  | "ai"
  | "vendor"
  | "system"
  | "tool"
  | "tool_response";
export type Channel = "WebChat" | "Email" | "System";
