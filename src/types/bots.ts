// =====================================================================
// Bot Types for Monstro-15 Migration
// =====================================================================
// These types correspond to the database schema created in the migration

// =====================================================================
// Enum Types (matching database enums)
// =====================================================================

export type BotStatus = "Draft" | "Active" | "Pause" | "Archived";
export type BotModel = "anthropic" | "gpt" | "gemini";
export type Channel =
  | "SMS"
  | "AI"
  | "Facebook"
  | "Google"
  | "WhatsApp"
  | "WebChat"
  | "Email"
  | "Contact"
  | "System";
export type MessageRole =
  | "user"
  | "ai"
  | "contact"
  | "system"
  | "tool"
  | "tool_response";
export type WorkflowStatus = "Draft" | "Active" | "Pause" | "Archived";
export type WorkflowQueueStatus =
  | "Processing"
  | "Completed"
  | "Failed"
  | "Cancelled";
export type DocumentType = "file" | "website";

// =====================================================================
// Node System Types (for bot conversation flows)
// =====================================================================

export type NodeDataType = {
  label: string;
  goal: string;
  paths: Paths;
  instructions?: string;
  functions?: AIFunction[];
  config?: NodeConfigs;
};

export type Paths = {
  [key: string]: string; // Path conditions to next nodes
};

export type AIFunction = {
  name: string;
  description: string;
  parameters: Record<string, any>;
};

export type NodeConfigs = {
  delay?: number;
  retryCount?: number;
  fallbackNode?: string;
};

// =====================================================================
// Core Bot Types
// =====================================================================

export type Bot = {
  id: string;
  locationId: string;
  name: string | null;
  initialMessage: string | null;
  prompt: string;
  objectives: NodeDataType[] | null;
  temperature: number;
  model: BotModel;
  invalidNodes: string[];
  status: BotStatus;
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

export type BotTemplate = {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  responseDetails: string;
  model: string;
  initialMessage: string | null;
  invalidNodes: string[];
  objectives: NodeDataType[];
  createdAt: Date;
  updatedAt: Date | null;
};

// =====================================================================
// AI Persona Types
// =====================================================================

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

export type BotPersona = {
  botId: string;
  personaId: string;
};

// =====================================================================
// Bot Scenario Types
// =====================================================================

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

// =====================================================================
// Knowledge Base Types
// =====================================================================

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
  embedding?: string; // Vector embedding for RAG
};

export type BotKnowledge = {
  botId: string;
  documentId: string;
};

// =====================================================================
// Contact Types (Hybrid Member/Guest Support)
// =====================================================================

export type UnifiedContact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  type: "member" | "guest";
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

// =====================================================================
// Conversation Types
// =====================================================================

export type Conversation = {
  id: string;
  locationId: string;
  memberId: string | null;
  guestContactId: string | null;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date | null;
};

export type Message = {
  id: string;
  conversationId: string;
  content: string;
  role: MessageRole;
  channel: Channel;
  metadata: Record<string, any>;
  createdAt: Date;
};

export type BotProgress = {
  id: string;
  botId: string;
  memberId: string | null;
  guestContactId: string | null;
  completed: boolean;
  currentNode: string;
  stopped: string | null;
  isActive: boolean;
  createdAt: Date;
};

export type BotLog = {
  id: string;
  botId: string;
  memberId: string | null;
  guestContactId: string | null;
  metadata: Record<string, any>;
  createdAt: Date;
};

// =====================================================================
// Workflow Types (for future workflow integration)
// =====================================================================

export type Workflow = {
  id: string;
  locationId: string;
  name: string;
  status: WorkflowStatus;
  nodes: NodeDataType[];
  invalidNodes: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date | null;
};

export type WorkflowTrigger = {
  id: string;
  workflowId: string;
  type: string;
  data: Record<string, any>;
};

export type WorkflowQueue = {
  id: string;
  workflowId: string;
  memberId: string | null;
  guestContactId: string | null;
  currentNode: string;
  stopped: string | null;
  status: WorkflowQueueStatus;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date | null;
};

export type WorkflowLog = {
  id: string;
  workflowId: string;
  queueId: string;
  metadata: Record<string, any>;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date | null;
};

// =====================================================================
// Chat Session Types (for Redis session management)
// =====================================================================

export type ChatSession = {
  id: string;
  botId: string;
  conversationId: string | null;
  currentObjective: string | null;
  routineId: string | null;
  routineObjective: string | null;
  lastActivity: string;
  conversationState: "new" | "ongoing" | "booking" | "information_gathering";
  collectedData: Record<string, any>;
  metadata: {
    contactContext: UnifiedContact | null;
    bot: Bot;
  };
};

// =====================================================================
// Frontend Component Props Types
// =====================================================================

export type BotListProps = {
  locationId: string;
  templates: BotTemplate[];
};

export type BotInfoProps = {
  locationId: string;
  personas: AIPersona[];
  documents: Document[];
};

export type AIChatBoxProps = {
  location: any; // TODO: Replace with proper Location type
};

export type BotFormData = {
  name: string;
  prompt: string;
  initialMessage: string;
  model: BotModel;
  temperature: number;
  status: BotStatus;
};

export type ScenarioFormData = {
  name: string;
  trigger: string;
  examples: string[];
  requirements: string[];
  yield: boolean;
};

// =====================================================================
// API Response Types
// =====================================================================

export type BotResponse = {
  bots: ExtendedBot[];
  total: number;
};

export type ContactResponse = {
  members: MemberContact[];
  guests: GuestContact[];
};

export type ChatResponse = {
  message: string;
  sessionId: string;
  conversationId: string;
};

// =====================================================================
// Form Validation Types
// =====================================================================

export type BotValidationErrors = {
  name?: string;
  prompt?: string;
  initialMessage?: string;
  model?: string;
  temperature?: string;
};

export type ScenarioValidationErrors = {
  name?: string;
  trigger?: string;
  examples?: string;
};

// =====================================================================
// Component State Types
// =====================================================================

export type BotPageState = {
  selectedBot: Bot | null;
  bots: Bot[];
  isLoading: boolean;
  error: string | null;
};

export type ChatState = {
  messages: Message[];
  isLoading: boolean;
  selectedContact: UnifiedContact | null;
  sessionId: string | null;
};
