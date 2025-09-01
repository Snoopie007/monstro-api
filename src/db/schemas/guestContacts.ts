import { pgTable, text, timestamp, jsonb, unique } from 'drizzle-orm/pg-core';
import { sql } from "drizzle-orm/sql";

import { locations } from './locations';

export const guestContacts = pgTable('guest_contacts', {
  id: text('id').primaryKey().default(sql`uuid_base62()`),
  locationId: text('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  phone: text('phone'),
  botMetadata: jsonb('bot_metadata').default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (table) => ({
  uniqueLocationEmail: unique('guest_contacts_location_email_unique').on(table.locationId, table.email),
}));