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

export type AttendanceResponse = {
  attendances: ExtendedAttendance[];
  missedReservations: MissedReservation[];
};


// Unified exception type - supports both recurring and single reservations
export type ReservationException = typeof reservationExceptions.$inferSelect & {
  reservation?: Reservation;
};

