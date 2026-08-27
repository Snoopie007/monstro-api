import { attendances } from "../schemas/attendances";
import { reservations } from "../schemas/reservations";
import type { Member, MemberPackage, MemberSubscription } from "./member";
import type { ProgramSession } from "./program";

export type Attendance = typeof attendances.$inferSelect & {
  reservation?: Reservation;
};

export type ExtendedAttendance = Attendance;

export type InsertReservation = typeof reservations.$inferInsert;




// Full reservation type - combi nes base fields with optional schema fields
export type Reservation = typeof reservations.$inferSelect & {
  session?: ProgramSession | null;
  member?: Member;
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

export type CheckinOption = {
  id: string;
  source: "reservation" | "walkin";
  reservationId: string | null;
  memberId: string;
  locationId: string;
  sessionId: string;
  startOn: Date;
  endOn: Date;
  session: ProgramSession;
  attendance?: Attendance | null;
};

