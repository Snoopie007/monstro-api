export type SupportAssistant = {
  id: string;
  locationId: string;
  name: string;
  prompt: string;
  initialMessage: string;
  temperature: number;
  model: "anthropic" | "gpt" | "gemini";
  status: "Draft" | "Active" | "Paused";
  availableTools: SupportTool[];
  persona: Record<string, any>; // JSONB field containing persona data
  createdAt: Date;
  updatedAt: Date | null;
};

export type SupportTool = {
  name: string;
  description: string;
  parameters?: Record<string, any>;
};

export type SupportTrigger = {
  id: string;
  supportAssistantId: string;
  name: string;
  triggerType: "keyword" | "intent" | "condition";
  triggerPhrases: string[];
  toolCall: Record<string, any>;
  examples: string[];
  requirements: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date | null;
};

export type SupportDocument = {
  id: string;
  supportAssistantId: string;
  name: string;
  filePath?: string;
  url?: string;
  type: "file" | "website";
  size?: number;
  createdAt: Date;
};

export type SupportDocumentChunk = {
  id: string;
  documentId: string;
  content: string;
  embedding?: number[];
};
