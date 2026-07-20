import { boolean, integer, jsonb, pgEnum, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const adminSupportCaseStatusEnum = pgEnum("SupportCaseStatus", ["open", "escalated", "closed", "pending"]);
export const adminMessageUserRoleEnum = pgEnum("MessageUserRole", ["user", "agent", "ai"]);
export const adminMessageTypeEnum = pgEnum("MessageType", ["message", "email", "call", "live chat"]);
export const adminSupportCaseSeverityEnum = pgEnum("SupportCaseSeverity", ["low", "medium", "high", "urgent"]);
export const adminSupportDocumentStatusEnum = pgEnum("SupportDocumentStatus", ["draft", "published", "archived"]);

export type AdminSupportMessageAttachment = { url: string; key?: string; filename: string; size?: number; contentType: string; uploadedAt?: string };
export type AdminSupportCaseMetadata = {
  firstName?: string | null; lastName?: string | null; email?: string | null; phone?: string | null;
  avatar?: string | null; vendorId?: string | null; stripeCustomerId?: string | null; role?: string | null;
  supportMode?: "ai" | "live" | null; supportAiPendingMessageId?: number | null;
};

export const adminSupportCases = pgTable("support_cases", {
  id: serial("id").primaryKey(), userId: text("user_id").notNull(), agentId: text("agent_id"), locationId: text("location_id").notNull(),
  subject: text("subject"), severity: adminSupportCaseSeverityEnum("severity").notNull().default("low"), category: text("category"),
  status: adminSupportCaseStatusEnum("status").notNull().default("pending"), metadata: jsonb("metadata").$type<AdminSupportCaseMetadata>().notNull().default({}),
  created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updated: timestamp("updated_at", { withTimezone: true }),
  snoozeUntil: timestamp("snooze_until", { withTimezone: true }), priority: boolean("priority"),
});
export const adminSupportCaseMessages = pgTable("support_case_messages", {
  id: serial("id").primaryKey(), agentId: text("agent_id"), emailMessageId: text("email_message_id"), type: adminMessageTypeEnum("type").notNull(),
  role: adminMessageUserRoleEnum("role").notNull(), caseId: integer("case_id").references(() => adminSupportCases.id).notNull(), content: text("content").notNull(),
  attachments: jsonb("attachments").$type<AdminSupportMessageAttachment[]>().notNull().default([]), created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const adminSupportCaseLogs = pgTable("support_case_logs", {
  id: serial("id").primaryKey(), caseId: integer("case_id").references(() => adminSupportCases.id).notNull(), agentId: text("agent_id"),
  from: adminSupportCaseStatusEnum("from_status").notNull(), to: adminSupportCaseStatusEnum("to_status").notNull(),
  created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const adminSupportCategories = pgTable("support_categories", { id: serial("id").primaryKey(), name: text("name").notNull(), description: text("description") });
export const adminSupportDocuments = pgTable("support_documents", {
  id: serial("id").primaryKey(), title: text("title").notNull(), slug: text("slug").notNull(), metaTitle: text("meta_title"), metaDescription: text("meta_description"),
  isPinned: boolean("is_pinned").notNull().default(false), mdxContent: text("mdx_content").notNull(), categoryId: integer("support_category_id").references(() => adminSupportCategories.id).notNull(),
  status: adminSupportDocumentStatusEnum("status").notNull().default("draft"), created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updated: timestamp("updated_at", { withTimezone: true }),
});
export type AdminSupportCase = typeof adminSupportCases.$inferSelect;
export type AdminSupportCaseMessage = typeof adminSupportCaseMessages.$inferSelect;
export type AdminSupportDocument = typeof adminSupportDocuments.$inferSelect;
