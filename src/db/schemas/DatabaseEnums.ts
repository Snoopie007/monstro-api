import { pgEnum } from "drizzle-orm/pg-core"

export const LocationStatusEnum = pgEnum("location_status", ["incomplete", "active", "past_due", "canceled", "paused", "trialing", "unpaid", "incomplete_expired", "archived"]);
export const PlanType = pgEnum("plan_type", ["recurring", "one-time"]);
export const IntervalType = pgEnum("interval_type", ["day", "week", "month", "year"]);
export const PackageStatusEnum = pgEnum("package_status", ["active", "incomplete", "expired", "completed"]);
export const PaymentTypeEnum = pgEnum("payment_type", ["cash", "card", "us_bank_account", 'paypal', 'apple_pay', 'google_pay']);
export const InvoiceStatusEnum = pgEnum("invoice_status", ["draft", "paid", "unpaid", "uncollectible", "void", "sent"]);
export const MemberRelationshipEnum = pgEnum("relationship", ["parent", "spouse", "child", "sibling", "other"]);
export const RoleColorEnum = pgEnum("role_color", ["red", "green", "blue", "pink", "cyan", "lime", "orange", "fuchsia", "sky", "lemon", "purple", "yellow"]);
export const ContractTypeEnum = pgEnum("contract_type", ["contract", "waiver"]);
export const TransactionTypeEnum = pgEnum("transaction_type", ["inbound", "outbound"]);
export const TransactionStatusEnum = pgEnum("transaction_status", ["paid", "failed", "incomplete"]);
export const StaffStatusEnum = pgEnum("staff_status", ["active", "inactive"]);
export const ProgramStatusEnum = pgEnum("program_status", ["active", "inactive", "archived"]);
export const ImportedMemberStatusEnum = pgEnum("imported_member_status", ["pending", "processing", "completed", "failed"]);
export const CustomFieldTypeEnum = pgEnum("custom_field_type", ["text", "number", "date", "boolean", "select", "multi-select"]);

// Reservation and Exception Enums
export const ReservationStatusEnum = pgEnum("reservation_status", [
  "confirmed",
  "cancelled_by_member",
  "cancelled_by_vendor",
  "cancelled_by_holiday",
  "completed",
  "no_show"
]);

export const ExceptionInitiatorEnum = pgEnum("exception_initiator", [
  "member",
  "vendor",
  "holiday",
  "maintenance"
]);