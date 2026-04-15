import {
    text,
    timestamp,
    pgTable,
    unique,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { locations } from './locations'
import { users } from './users'
import { StaffStatusEnum } from './DatabaseEnums'

export const staffs = pgTable('staffs', {
    id: text('id').primaryKey().notNull().default(sql`uuid_base62('stf_')`),
    firstName: text('first_name').notNull(),
    lastName: text('last_name'),
    email: text('email').notNull().unique(),
    phone: text('phone').notNull(),
    userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
    created: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
})

export const staffsLocations = pgTable(
    'staff_locations',
    {
        id: text('id').primaryKey().notNull().default(sql`uuid_base62()`),
        staffId: text('staff_id')
            .notNull()
            .references(() => staffs.id, { onDelete: 'cascade' }),
        locationId: text('location_id')
            .notNull()
            .references(() => locations.id, { onDelete: 'cascade' }),
        status: StaffStatusEnum('status').notNull().default('active'),
    },
    (t) => [unique('staff_locations_staff_location_unique').on(t.staffId, t.locationId)]
)
