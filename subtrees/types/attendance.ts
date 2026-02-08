import {
  recurringReservations,
  reservationExceptions,
  reservations,
} from "subtrees/schemas/reservations";
import type { ProgramSession } from "subtrees/types/program";
import type { Member, MemberPackage, MemberSubscription } from "./member";
import { attendances } from "subtrees/schemas/attendances";
import type { Location } from "./location";

export type Attendance = typeof attendances.$inferSelect & {
  recurring?: RecurringReservation;
  reservation?: Reservation;
};

export type ExtendedAttendance = Attendance & {
  programName: string;
};

export type InsertReservation = typeof reservations.$inferInsert;

export type Reservation = typeof reservations.$inferSelect & {
  isRecurring?: boolean;
  recurringId?: string;
  session?: ProgramSession | null;
  member?: Member;
  exceptions?: ReservationException[];
  memberSubscription?: MemberSubscription | null;
  memberPackage?: MemberPackage | null;
  attendance?: Attendance;
};

export type RecurringReservation = typeof recurringReservations.$inferSelect & {
  session?: ProgramSession | null;
  location?: Location;
  attendances?: Attendance[];
  member?: Member;
  exceptions?: ReservationException[];
};

// Unified exception type - supports both recurring and single reservations
export type ReservationException =
  typeof reservationExceptions.$inferSelect & {
    recurring?: RecurringReservation;
    reservation?: Reservation;
  };

// Backward compatible alias
export type RecurringReservationException = ReservationException;
