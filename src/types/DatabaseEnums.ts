export type LocationStatus = 'incomplete' | 'active' | 'past_due' | 'canceled' | 'paused' | 'trialing' | 'unpaid' | 'incomplete_expired';
export type PlanType = 'recurring' | 'one-time';
export type Interval = 'day' | 'week' | 'month' | 'year';
export type PackageStatus = 'active' | 'incomplete' | 'expired' | 'completed';
export type PaymentMethod = 'card' | 'cash' | 'check' | 'zelle' | 'venmo' | 'paypal' | 'apple' | 'google';
export type InvoiceStatus = 'draft' | 'paid' | 'unpaid' | 'uncollectible' | 'void';
export type MemberRelationship = 'parent' | 'spouse' | 'child' | 'sibling' | 'other';
export type ContractType = 'contract' | 'waiver';
export type RoleColor = "red" | "green" | "blue" | "pink" | "cyan" | "lime" | "orange" | "fuchsia" | "sky" | "lemon" | "purple" | "yellow";
export type TransactionStatus = 'paid' | 'failed' | 'incomplete';
export type StaffStatus = 'active' | 'inactive';
export type ProgramStatus = 'active' | 'inactive';
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type TransactionType = 'inbound' | 'outbound';

export enum BotStatus {
    Draft = "Draft",
    Active = "Active",
    Paused = "Paused",
}

export enum Channel {
    WebChat = "WebChat",
    Email = "Email",
    System = "System",
}

export enum MessageRole {
    User = "user",
    AI = "ai",
    Vendor = "vendor",
    System = "system",
    Tool = "tool",
    ToolResponse = "tool_response",
}

export enum BotModel {
    Anthropic = "anthropic",
    GPT = "gpt",
    Gemini = "gemini",
}

export enum DocumentType {
    File = "file",
    Website = "website",
}

export enum TicketStatus {
    Open = "open",
    InProgress = "in_progress",
    Resolved = "resolved",
    Closed = "closed",
}

export enum TriggerType {
    Keyword = "keyword",
    Intent = "intent",
    Condition = "condition",
}
