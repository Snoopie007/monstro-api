export type SupportBot = {
  id: string;
  locationId: string;
  name: string;
  prompt: string;
  initialMessage: string;
  temperature: number;
  model: "anthropic" | "gpt" | "gemini";
  status: "Draft" | "Active" | "Paused";
  availableTools: SupportTool[];
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
  supportBotId: string;
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

export type SupportBotPersona = {
  id: string;
  supportBotId: string;
  name: string;
  image?: string;
  responseStyle: string;
  personalityTraits: string[];
  createdAt: Date;
  updatedAt: Date | null;
};

export type SupportDocument = {
  id: string;
  supportBotId: string;
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
