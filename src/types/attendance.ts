import {
  attendances,
  recurringReservations,
  reservationExceptions,
  reservations,
} from "@/db/schemas";
import { ProgramSession } from "@/types/program";
import { Member, MemberPackage } from "./member";

export type Attendance = typeof attendances.$inferSelect & {
  recurring?: RecurringReservation;
  reservation?: Reservation;
  programName?: string;
};

export type ExtendedAttendance = Attendance & {
  programId: string | null;
  programName: string;
};

export type Reservation = typeof reservations.$inferSelect & {
  isRecurring?: boolean;
  recurringId?: string;
  session?: ProgramSession;
  member?: Member;
  memberPackage?: MemberPackage | null;
  exceptions?: ReservationException[];
};

export type RecurringReservation = typeof recurringReservations.$inferSelect & {
  session?: ProgramSession;
  location?: Location;
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
