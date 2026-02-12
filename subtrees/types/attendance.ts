import {
  recurringReservations,
  reservationExceptions,
  reservations,
} from "../schemas/reservations";
import type { ProgramSession } from "./program";
import type { Member, MemberPackage, MemberSubscription } from "./member";
import { attendances } from "../schemas/attendances";
import type { Location } from "./location";

export type Attendance = typeof attendances.$inferSelect & {
  recurring?: RecurringReservation;
  reservation?: Reservation;
};

export type ExtendedAttendance = Attendance & {
  programName: string;
};

export type InsertReservation = typeof reservations.$inferInsert;

// Base reservation fields that are always required
export type ReservationBase = {
  id: string;
  sessionId: string | null;
  memberId: string;
  memberSubscriptionId: string | null;
  memberPackageId: string | null;
  locationId: string;
  startOn: Date;
  endOn: Date;
  created: Date;
};

// Full reservation type - combines base fields with optional schema fields
export type Reservation = ReservationBase &
  Partial<Omit<typeof reservations.$inferSelect, keyof ReservationBase>> & {
    isRecurring?: boolean;
    recurringId?: string;
    session?: ProgramSession | null;
    member?: Member;
    exceptions?: ReservationException[];
    memberSubscription?: MemberSubscription | null;
    memberPackage?: MemberPackage | null;
    attendance?: Attendance;
  };

export type MissedReservation = {
  id: string;
  startOn: Date | string;
  programId: string | null;
  programName: string;
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
