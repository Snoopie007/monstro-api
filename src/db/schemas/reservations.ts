
import { relations } from "drizzle-orm";
import { integer, serial, timestamp, pgTable } from "drizzle-orm/pg-core";
import { programSessions } from "./programs";
import { members } from "./members";
import { attendances } from "./attendances";
import { memberPackages, memberSubscriptions } from "./MemberPlans";
import { ReservationStatusEnum } from "./enums";
import { locations } from "./locations";


export const reservations = pgTable("reservations", {
    id: integer("id").primaryKey(),
    sessionId: integer("session_id").notNull().references(() => programSessions.id, { onDelete: "cascade" }),
    memberId: integer("member_id").references(() => members.id, { onDelete: "cascade" }),
    memberSubscriptionId: integer("member_subscription_id").references(() => memberSubscriptions.id, { onDelete: "cascade" }),
    memberPackageId: integer("member_package_id").references(() => memberPackages.id, { onDelete: "cascade" }),
    locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade" }),
    status: ReservationStatusEnum("status").default("active").notNull(),
    expiredDate: timestamp("expired_on", { withTimezone: true }),
    canceledDate: timestamp("canceled_on", { withTimezone: true }),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
});

export const reservationsRelations = relations(reservations, ({ one, many }) => ({
    attendances: many(attendances),
    session: one(programSessions, {
        fields: [reservations.sessionId],
        references: [programSessions.id],
    }),
    member: one(members, {
        fields: [reservations.memberId],
        references: [members.id],
    }),
    memberSubscription: one(memberSubscriptions, {
        fields: [reservations.memberSubscriptionId],
        references: [memberSubscriptions.id],
    }),
    memberPackage: one(memberPackages, {
        fields: [reservations.memberPackageId],
        references: [memberPackages.id],
    }),
    location: one(locations, {
        fields: [reservations.locationId],
        references: [locations.id],
    }),
}));
