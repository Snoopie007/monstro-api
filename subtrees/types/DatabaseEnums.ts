export enum LocationStatus {
    INCOMPLETE = "incomplete",
    ACTIVE = "active",
    PAST_DUE = "past_due",
    CANCELED = "canceled",
    PAUSED = "paused",
    TRIALING = "trialing",
    UNPAID = "unpaid",
    INCOMPLETE_EXPIRED = "incomplete_expired",
    ARCHIVED = "archived"
};

export enum PackageStatus {
    ACTIVE = "active",
    INCOMPLETE = "incomplete",
    EXPIRED = "expired",
    COMPLETED = "completed"
};



export type PlanType = 'recurring' | 'one-time';
export type Interval = 'day' | 'week' | 'month' | 'year';
export type PaymentType = 'card' | 'cash' | 'us_bank_account' | 'paypal' | 'apple_pay' | 'google_pay';
export type InvoiceStatus = 'draft' | 'paid' | 'unpaid' | 'uncollectible' | 'void';
export type MemberRelationship = 'parent' | 'spouse' | 'child' | 'sibling' | 'extended';
export type FamilyMemberStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';
export type ContractType = 'contract' | 'waiver';
export type RoleColor = "red" | "green" | "blue" | "pink" | "cyan" | "lime" | "orange" | "fuchsia" | "sky" | "lemon" | "purple" | "yellow";
export type TransactionStatus = 'paid' | 'failed' | 'disputed';
export type StaffStatus = 'active' | 'inactive';
export type ProgramStatus = 'active' | 'inactive' | 'archived';
export type MigrateStatus = 'pending' | 'completed';
export type TransactionType = 'inbound' | 'outbound';
export type ASsistantStatus = "draft" | "active" | "paused";
export type Channel = "webchat" | "email" | "system";
export type MessageRole = "human" | "ai" | "staff" | "system" | "tool" | "tool_message";
export type ConversationStatus = "open" | "in_progress" | "resolved" | "closed";
export type TriggerType = "keyword" | "intent" | "condition";
export type BotModel = "gpt" | "anthropic" | "gemini";
export type OwnerType = "post" | "message" | "moment";
export type FileType = "image" | "video" | "audio" | "document" | "other";
export enum PromoType {
    Percentage = "percentage",
    FixedAmount = "fixed_amount",
    FreeTrial = "free_trial"
}
export type PromoDuration = "once" | "repeating" | "forever";