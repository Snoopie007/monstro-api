import { RecurringReservation, Reservation } from "./attendance";
import { MemberPlan } from "./member";
import { ProgramStatus } from "./DatabaseEnums";
import { planPrograms, programSessions, programs } from "@subtrees/schemas";
import { Staff } from "./staff";

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

export type ProgramSession = typeof programSessions.$inferSelect & {
  recurringReservations?: RecurringReservation[];
  program?: Program,
  reservations?: Reservation[]
  reservationsCount?: number | null
  staff?: Staff;
  canceled?: boolean;
}


export type ExtendedProgramSession = ProgramSession & {
  availability: number;
  isFull: boolean;
  isReserved: boolean;
  planIds: string[];
  startTime: Date;
  endTime: Date;

}
