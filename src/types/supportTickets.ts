export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export type SupportTicket = {
  id: string;
  conversationId: string;
  title: string;
  description?: string;
  status: TicketStatus;
  priority: number; // 1=high, 2=medium, 3=low
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date | null;
  metadata?: Record<string, any>;
};

export type SupportLog = {
  id: string;
  supportAssistantId: string;
  conversationId?: string;
  action: string; // 'chat', 'tool_call', 'vendor_takeover', etc.
  metadata: Record<string, any>;
  createdAt: Date;
};
