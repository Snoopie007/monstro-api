import {
  text,
  timestamp,
  time,
  smallint,
  pgTable,
  integer,
  unique,
  boolean,
  primaryKey,
  uuid,
} from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { relations, sql } from "drizzle-orm";
import { memberPlans } from "./MemberPlans";
import { recurringReservations, reservations } from "./reservations";
import { staffs } from "./staffs";
import { IntervalType, ProgramStatusEnum } from "./DatabaseEnums";

export const programs = pgTable("programs", {
  id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
  name: text("name").notNull(),
  description: text("description"),
  capacity: integer("capacity").notNull(),
  minAge: integer("min_age").notNull(),
  maxAge: integer("max_age").notNull(),
  locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  instructorId: text("instructor_id").references(() => staffs.id, { onDelete: "set null" }),
  interval: IntervalType("interval").notNull().default("week"),
  intervalThreshold: smallint("interval_threshold").notNull().default(1),
  icon: text("icon"),
  allowWaitlist: boolean("allow_waitlist").notNull().default(false),
  waitlistCapacity: smallint("waitlist_capacity").notNull().default(0),
  allowMakeUpClass: boolean("allow_make_up_class").notNull().default(false),
  cancelationThreshold: smallint("cancelation_threshold").notNull().default(0),
  created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  status: ProgramStatusEnum("status").notNull().default("active"),
  updated: timestamp("updated_at", { withTimezone: true }),
});

export const planPrograms = pgTable("plan_programs", {
  planId: text("plan_id").notNull().references(() => memberPlans.id, { onDelete: "cascade" }),
  programId: text("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.planId, t.programId] })]);

export const programSessions = pgTable("program_sessions", {
  id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
  programId: text("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  time: time("time").notNull(),
  duration: smallint("duration").notNull().default(0),
  day: smallint("day").notNull().default(1),
  created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [unique("unique_program_session").on(t.programId, t.time, t.duration, t.day)]);

export const programsRelations = relations(programs, ({ one, many }) => ({
  location: one(locations, {
    fields: [programs.locationId],
    references: [locations.id],
  }),
  plans: many(memberPlans, { relationName: "planPrograms" }),
  planPrograms: many(planPrograms),
  sessions: many(programSessions),
  instructor: one(staffs, {
    fields: [programs.instructorId],
    references: [staffs.id],
  }),
}));

export const programSessionsRelations = relations(
  programSessions,
  ({ one, many }) => ({
    program: one(programs, {
      fields: [programSessions.programId],
      references: [programs.id],
    }),
    reservations: many(reservations),
    recurringReservations: many(recurringReservations),
  })
);

export const planProgramsRelations = relations(planPrograms, ({ one }) => ({
  plan: one(memberPlans, {
    fields: [planPrograms.planId],
    references: [memberPlans.id],
  }),
  program: one(programs, {
    fields: [planPrograms.programId],
    references: [programs.id],
  }),
}));
