import { pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";
import { locations } from "./locations";
import { members } from "./members";

export const memberTags = pgTable('member_tags', {
    id: text('id').primaryKey().notNull().default(sql`uuid_base62('tag_')`),
    name: text('name').notNull(),
    locationId: text('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
})

export const memberHasTags = pgTable('member_has_tags', {
    memberId: text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
    tagId: text('tag_id').notNull().references(() => memberTags.id, { onDelete: 'cascade' }),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [primaryKey({ columns: [t.memberId, t.tagId] })])
