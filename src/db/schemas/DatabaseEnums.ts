import { pgEnum } from "drizzle-orm/pg-core"

const LocationStatusEnum = pgEnum("location_status", ["incomplete", "active", "past_due", "canceled", "paused", "trialing", "unpaid", "incomplete_expired"])
const PlanType = pgEnum("plan_type", ["recurring", "one-time"]);
const PlanInterval = pgEnum("plan_interval", ["day", "week", "month", "year"]);
const PackageStatusEnum = pgEnum("package_status", ["active", "incomplete", "expired", "completed"]);
const PaymentMethodEnum = pgEnum("payment_method", ["card", "cash", "check", "zelle", "venmo", "paypal", "apple", "google"]);
const InvoiceStatusEnum = pgEnum("invoice_status", ["draft", "paid", "unpaid", "uncollectible", "void"]);
const MemberRelationshipEnum = pgEnum('relationship', ['parent', 'spouse', 'child', 'sibling', 'other']);
const RoleColorEnum = pgEnum('role_color', ["red", "green", "blue", "pink", "cyan", "lime", "orange", "fuchsia", "sky", "lemon", "purple", "yellow"]);
const ContractTypeEnum = pgEnum('contract_type', ['contract', 'waiver']);
const TransactionStatusEnum = pgEnum("transaction_status", ["paid", "failed", "incomplete"]);
const StaffStatusEnum = pgEnum("staff_status", ["active", "inactive"]);
const ProgramStatusEnum = pgEnum("program_status", ["active", "inactive"]);
const ImportedMemberStatusEnum = pgEnum("imported_member_status", ["pending", "processing", "completed", "failed"]);
const TransactionTypeEnum = pgEnum("transaction_type", ["inbound", "outbound"]);

export {
    LocationStatusEnum,
    PlanType,
    TransactionTypeEnum,
    PlanInterval,
    PackageStatusEnum,
    PaymentMethodEnum,
    InvoiceStatusEnum,
    MemberRelationshipEnum,
    RoleColorEnum,
    ContractTypeEnum,
    TransactionStatusEnum,
    StaffStatusEnum,
    ProgramStatusEnum,
    ImportedMemberStatusEnum
}