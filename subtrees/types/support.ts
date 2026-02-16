import type {
    supportAssistants,
    supportConversations,
    supportMessages,
    supportTriggers,
} from "../schemas";
import type { KnowledgeBase } from "./KnowledgeBase";
import type { Member } from "./member";
// Settings UI Types
export interface SupportAssistantSettingsRequest {
  prompt: string;
  initialMessage: string;
  temperature: number;
  model: string;
  persona: SupportPersona;
}
export type SupportTrigger = typeof supportTriggers.$inferSelect;

export type SupportConversation = typeof supportConversations.$inferSelect & {
  assistant?: SupportAssistant;
  member?: Member;
  messages?: SupportMessage[];
};
export type SupportConversationStatus =
  (typeof supportConversations.$inferSelect)["status"];

export type NewSupportConversation = typeof supportConversations.$inferInsert;
export type SupportAssistant = typeof supportAssistants.$inferSelect & {
  triggers?: SupportTrigger[];
  conversations?: SupportConversation[];
  persona: SupportPersona;
  knowledgeBase: KnowledgeBase;
};

export type SupportAssistantSettings = typeof supportAssistants.$inferSelect & {
  triggers?: SupportTrigger[];
  conversations?: SupportConversation[];
  persona: SupportPersona;
  knowledgeBase: KnowledgeBase;
};

export type NewSupportAssistant = typeof supportAssistants.$inferInsert & {
  persona: SupportPersona;
};
export type SupportMessage = typeof supportMessages.$inferSelect & {
  role: SupportMessageRole;
};
export type NewSupportMessage = typeof supportMessages.$inferInsert;

export type SupportPersona = {
    name: string;
    avatar: string;
    responseStyle: string;
    personality: string[];
};

export type SupportTool = {
  name: string;
  description: string;
  parameters: Record<string, any>;
  args: Record<string, any>;
};

export type SupportMessageRole =
    | "human"
    | "ai"
    | "staff"
    | "assistant"
    | "system"
    | "tool"
    | "tool_response"
    | "tool_call";

// Test Chat API Routes
export interface TestChatMessage {
  id: string;
  role: SupportMessageRole;
  content: string;
  tool_calls?: Record<string, any>[];
  tool_call_id?: string;
  metadata?: any;
  timestamp: number;
}

// export interface TestChatSession {
//   id: string;
//   locationId: string;
//   messages: TestChatMessage[];
//   lastActivity: number;
//   testMemberId?: string;
// }

export type CustomVariableGroup = {
  name: string;
  variables: CustomVariable[];
};

export type CustomVariable = {
  id: number;
  label: string;
  value: string;
};
