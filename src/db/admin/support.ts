import { integer, serial, text, timestamp, pgTable, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';
import { adminUsers } from ".";
import { MessageTypeEnum, MessageUserRoleEnum, SupportCaseSeverityEnum, SupportCaseStatusEnum } from "./AdminEnums";
import { SupportCaseMetadata } from "@/types/admin";

export const supportCases = pgTable("support_cases", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    agentId: integer("agent_id").references(() => adminUsers.id),
    locationId: integer("location_id").notNull(),
    subject: text("subject").notNull(),
    severity: SupportCaseSeverityEnum("severity").notNull().default("low"),
    category: text("category").notNull(),
    message: text("message").notNull(),
    video: text("video"),
    status: SupportCaseStatusEnum("status").notNull().default("open"),
    metadata: jsonb("metadata").$type<SupportCaseMetadata>().notNull().default({}),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true })
});

export const supportCaseNotes = pgTable("support_case_notes", {
    id: serial("id").primaryKey(),
    caseId: integer("case_id").references(() => supportCases.id).notNull(),
    agentId: integer("agent_id").references(() => adminUsers.id).notNull(),
    note: text("note").notNull(),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true })
});

export const supportCaseMessages = pgTable("support_case_messages", {
    id: serial("id").primaryKey(),
    agentId: integer("agent_id").references(() => adminUsers.id),
    type: MessageTypeEnum("type").notNull(),
    role: MessageUserRoleEnum("role").notNull(),
    caseId: integer("case_id").references(() => supportCases.id).notNull(),
    content: text("content").notNull(),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const supportCaseLogs = pgTable("support_case_logs", {
    id: serial("id").primaryKey(),
    caseId: integer("case_id").references(() => supportCases.id).notNull(),
    agentId: integer("agent_id").references(() => adminUsers.id),
    from: SupportCaseStatusEnum("from_status").notNull(),
    to: SupportCaseStatusEnum("to_status").notNull(),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});


export const supportCategories = pgTable("support_categories", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true })
});

export const supportDocMeta = pgTable("support_doc_metas", {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    file: text("file").notNull(),
    description: text("description"),
    published: boolean("published").notNull().default(false),
    tags: text("tags").array(),
    supportCategoryId: integer("support_category_id").references(() => supportCategories.id).notNull(),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true })
});

export const supportCategoriesRelation = relations(supportCategories, ({ many }) => ({
    metas: many(supportDocMeta)
}));

export const supportDocMetaRelation = relations(supportDocMeta, ({ one }) => ({
    supportCategory: one(supportCategories, {
        fields: [supportDocMeta.supportCategoryId],
        references: [supportCategories.id]
    }),
}));


export const supportCasesRelations = relations(supportCases, ({ one, many }) => ({
    agent: one(adminUsers, {
        fields: [supportCases.agentId],
        references: [adminUsers.id],
    }),
    messages: many(supportCaseMessages),
    notes: many(supportCaseNotes),
    logs: many(supportCaseLogs)
}));

export const supportCaseMessagesRelations = relations(supportCaseMessages, ({ one }) => ({
    case: one(supportCases, {
        fields: [supportCaseMessages.caseId],
        references: [supportCases.id],
    }),
    agent: one(adminUsers, {
        fields: [supportCaseMessages.agentId],
        references: [adminUsers.id]
    })
}));

export const supportCaseNotesRelations = relations(supportCaseNotes, ({ one }) => ({
    case: one(supportCases, {
        fields: [supportCaseNotes.caseId],
        references: [supportCases.id],
    }),
    agent: one(adminUsers, {
        fields: [supportCaseNotes.agentId],
        references: [adminUsers.id]
    })
}));

export const supportCaseLogsRelations = relations(supportCaseLogs, ({ one }) => ({
    case: one(supportCases, {
        fields: [supportCaseLogs.caseId],
        references: [supportCases.id]
    }),
    agent: one(adminUsers, {
        fields: [supportCaseLogs.agentId],
        references: [adminUsers.id]
    })
}));
