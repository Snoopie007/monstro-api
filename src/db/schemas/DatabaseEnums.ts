import { pgEnum } from "drizzle-orm/pg-core"

export const LocationStatusEnum = pgEnum("location_status", ["incomplete", "active", "past_due", "canceled", "paused", "trialing", "unpaid", "incomplete_expired"]);
export const PlanType = pgEnum("plan_type", ["recurring", "one-time"]);
export const PlanInterval = pgEnum("plan_interval", ["day", "week", "month", "year"]);
export const PackageStatusEnum = pgEnum("package_status", ["active", "incomplete", "expired", "completed"]);
export const PaymentMethodEnum = pgEnum("payment_method", ["card", "cash", "check", "zelle", "venmo", "paypal", "apple", "google"]);
export const InvoiceStatusEnum = pgEnum("invoice_status", ["draft", "paid", "unpaid", "uncollectible", "void"]);
export const MemberRelationshipEnum = pgEnum("relationship", ["parent", "spouse", "child", "sibling", "other"]);
export const RoleColorEnum = pgEnum("role_color", ["red", "green", "blue", "pink", "cyan", "lime", "orange", "fuchsia", "sky", "lemon", "purple", "yellow"]);
export const ContractTypeEnum = pgEnum("contract_type", ["contract", "waiver"]);
export const TransactionTypeEnum = pgEnum("transaction_type", ["inbound", "outbound"]);
export const TransactionStatusEnum = pgEnum("transaction_status", ["paid", "failed", "incomplete"]);
export const StaffStatusEnum = pgEnum("staff_status", ["active", "inactive"]);
export const ProgramStatusEnum = pgEnum("program_status", ["active", "inactive"]);
export const ImportedMemberStatusEnum = pgEnum("imported_member_status", ["pending", "processing", "completed", "failed"]);