export type Bot = {
  id: string;
  locationId: string;
  name: string | null;
  initialMessage: string | null;
  prompt: string;
  objectives: any[] | null;
  temperature: number;
  model: "anthropic" | "gpt" | "gemini";
  invalidNodes: string[];
  status: "Draft" | "Active" | "Pause" | "Archived";
  createdAt: Date;
  updatedAt: Date | null;
};

export type ExtendedBot = Bot & {
  knowledge?: Document[];
  botKnowledge?: BotKnowledge[];
  botPersona?: BotPersona[];
  persona?: AIPersona[];
  scenarios?: BotScenario[];
};

export type BotScenario = {
  id: string;
  name: string;
  botId: string;
  workflowId: string | null;
  routineId: string | null;
  trigger: string;
  examples: string[];
  requirements: string[];
  yield: boolean;
  createdAt: Date;
  updatedAt: Date | null;
};

export type NodeDataType = {
  label: string;
  goal: string;
  paths: Paths;
  instructions?: string;
  functions?: AIFunction[];
  config?: NodeConfigs;
};

export type Paths = {
  [key: string]: string;
};

export type AIFunction = {
  name: string;
  description: string;
  parameters: Record<string, any>;
};

export type NodeConfigs = {
  // Configuration options
};

export type BotKnowledge = {
  botId: string;
  documentId: string;
};

export type BotPersona = {
  botId: string;
  personaId: string;
};

export type AIPersona = {
  id: string;
  locationId: string;
  name: string;
  image: string | null;
  responseDetails: string;
  personality: string[];
  createdAt: Date;
  updatedAt: Date | null;
};

export type DocumentType = 'file' | 'website';

export type Document = {
  id: string;
  name: string;
  filePath: string | null;
  url: string | null;
  type: DocumentType;
  locationId: string;
  size: number | null;
  createdAt: Date;
};

export type DocumentMetadata = {
  id: string;
  documentId: string;
  metadata: Record<string, any>;
  createdAt: Date;
};

export type DocumentChunk = {
  id: string;
  documentId: string;
  content: string;
  embedding?: string;
};

export type UnifiedContact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  type: 'member' | 'guest';
  botMetadata?: Record<string, any>;
  createdAt: Date;
};

export type GuestContact = {
  id: string;
  locationId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  botMetadata: Record<string, any>;
  createdAt: Date;
};

export type MemberContact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  botMetadata: Record<string, any>;
  memberLocationId: string;
};

export type Message = {
  id: string;
  conversationId: string;
  content: string;
  role: "user" | "ai" | "contact" | "system" | "tool" | "tool_response";
  channel: "SMS" | "AI" | "Facebook" | "Google" | "WhatsApp" | "WebChat" | "Email" | "Contact" | "System";
  metadata: Record<string, any>;
  createdAt: Date;
};

export type BotTemplate = {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  responseDetails: string;
  model: string;
  initialMessage: string | null;
  invalidNodes: string[];
  objectives: any[];
  createdAt: Date;
  updatedAt: Date | null;
};

// ... all other bot-related types