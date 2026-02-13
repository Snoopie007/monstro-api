import {
  reservationExceptions,
  reservations,
} from "../schemas/reservations";
import type { Program, ProgramSession } from "./program";
import type { Member, MemberPackage, MemberSubscription } from "./member";
import { attendances } from "../schemas/attendances";

export type Attendance = typeof attendances.$inferSelect & {
  reservation?: Reservation;
};

export type ExtendedAttendance = Attendance;

export type InsertReservation = typeof reservations.$inferInsert;


// Full reservation type - combines base fields with optional schema fields
export type Reservation = typeof reservations.$inferSelect & {
  session?: ProgramSession | null;
  member?: Member;
  exceptions?: ReservationException[];
  program?: Program;
  memberSubscription?: MemberSubscription | null;
  memberPackage?: MemberPackage | null;
  attendance?: Attendance;
};


// Unified exception type - supports both recurring and single reservations
export type ReservationException = typeof reservationExceptions.$inferSelect & {
  reservation?: Reservation;
};

