import { pgEnum } from "drizzle-orm/pg-core";

export const AdminUserRoleEnum = pgEnum("AdminUserRole", ["Staff", "Admin"]);
export const SalesStatusEnum = pgEnum("SalesStatus", ["Pending", "Closed", "Completed", "Cancelled", "Upgraded", "Downgraded"]);
export const SupportCaseStatusEnum = pgEnum("SupportCaseStatus", ["open", "escalated", "closed"]);
export const MessageUserRoleEnum = pgEnum("MessageUserRole", ["user", "agent", "ai"]);
export const MessageTypeEnum = pgEnum("MessageType", ["message", "email", "call", "live chat"]);
export const SupportCaseSeverityEnum = pgEnum("SupportCaseSeverity", ["low", "medium", "high", "urgent"]);
export const AIBotStatusEnum = pgEnum("AIBotStatus", ["Draft", "Active", "Pause", "Deleted"]);