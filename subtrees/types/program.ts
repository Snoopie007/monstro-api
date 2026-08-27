import { planPrograms, programs, programSessions } from "../schemas/programs";
import { sessionExceptions } from "../schemas/sessionExceptions";
import type { Reservation } from "./attendance";
import type { ProgramStatus } from "./DatabaseEnums";
import type { LocationClosure } from "./location";
import type { MemberPlan } from "./member";
import type { Staff } from "./staff";

export type Program = typeof programs.$inferSelect & {
  programPlans?: PlanProgram[];
  status: ProgramStatus;
  sessions?: ProgramSession[];
  instructor?: Staff;
  color?: number;
};

export type PlanProgram = typeof planPrograms.$inferSelect & {
  planId: string;
  programId: string;
  program?: Program;
  plan?: MemberPlan;
}

export type SessionException = typeof sessionExceptions.$inferSelect & {
  session?: ProgramSession;
};

export type ProgramSession = typeof programSessions.$inferSelect & {
  program?: Program,
  reservations?: Reservation[]
  reservationsCount?: number | null
  staff?: Staff;
  canceled?: boolean;
  exceptions?: SessionException[];
}


export type ExtendedProgramSession = ProgramSession & {
  closure: LocationClosure | null;
  availability: number;
  isFull: boolean;
  isReserved: boolean;
  planIds: string[];
  startTime: Date;
  endTime: Date;
  utcStartTime: Date;
  utcEndTime: Date;
  holidayName?: string;
  exception?: SessionException;
}
