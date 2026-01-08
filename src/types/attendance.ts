import {
  recurringReservations,
  reservationExceptions,
  reservations,
} from "@/db/schemas/reservations";
import type { ProgramSession } from "@/types/program";
import type { Member, MemberPackage, MemberSubscription } from "./member";
import { attendances } from "@/db/schemas/attendances";
import type { Location } from "./location";

export type Attendance = typeof attendances.$inferSelect & {
  recurring?: RecurringReservation;
  reservation?: Reservation;
};

export type ExtendedAttendance = Attendance & {
  programName: string;
};

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
