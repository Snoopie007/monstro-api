import { boolean, date, bigint, pgTable, serial, timestamp, text, integer } from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { relations } from "drizzle-orm";
import { programs } from "./programs";
import { memberPlans } from "./MemberPlans";
import { members } from "./members";

export const importMembers = pgTable("import_members", {
    id: serial("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    lastRenewalDay: date("last_renewal_day").notNull(),
    status: text("status").notNull().default("Active"),
    terms: text("terms").notNull().default("months"),
    termCount: integer("term_count").notNull(),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
    planId: integer("plan_id").references(() => memberPlans.id),
    memberId: integer("member_id").references(() => members.id),
    isFamilyPlan: boolean("is_family_plan").notNull().default(false),
    isPrimaryMember: boolean("is_primary_member").notNull().default(false),
    processed: boolean("processed").notNull().default(false),
    locationId: integer("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
});



export const importedMembersRelations = relations(importMembers, ({ one }) => ({
    location: one(locations, {
        fields: [importMembers.locationId],
        references: [locations.id],
    }),
    member: one(members, {
        fields: [importMembers.memberId],
        references: [members.id],
    }),
    plan: one(memberPlans, {
        fields: [importMembers.planId],
        references: [memberPlans.id],
    })
}));
