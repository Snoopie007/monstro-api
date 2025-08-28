import {
  recurringReservations,
  recurringReservationsExceptions,
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
  session?: ProgramSession;
  member?: Member;
  exceptions?: RecurringReservationException[];
  memberSubscription?: MemberSubscription | null;
  memberPackage?: MemberPackage | null;
  attendance?: Attendance;
};

export type RecurringReservation = typeof recurringReservations.$inferSelect & {
  session?: ProgramSession;
  location?: Location;
  attendances?: Attendance[];
  member?: Member;
  exceptions?: RecurringReservationException[];
};

export type RecurringReservationException =
  typeof recurringReservationsExceptions.$inferSelect & {
    recurring?: RecurringReservation;
    reservation?: Reservation;
  };
