import {
  attendances,
  recurringReservations,
  recurringReservationsExceptions,
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
  programName: string;
};

export type Reservation = typeof reservations.$inferSelect & {
  isRecurring?: boolean;
  recurringId?: string;
  session?: ProgramSession;
  member?: Member;
  memberPackage?: MemberPackage | null;
  exceptions?: RecurringReservationException[];
};

export type RecurringReservation = typeof recurringReservations.$inferSelect & {
  session?: ProgramSession;
  location?: Location;
  member?: Member;
  exceptions?: RecurringReservationException[];
};

export type RecurringReservationException =
  typeof recurringReservationsExceptions.$inferSelect & {
    recurring?: RecurringReservation;
    reservation?: Reservation;
  };
