import { RecurringReservation, Reservation } from "./attendance";
import { MemberPlan } from "./member";
import { ProgramStatus } from "./DatabaseEnums";
import { planPrograms, programSessions, programs } from "@/db/schemas";
import { Staff } from "./staff";

export type Program = typeof programs.$inferSelect & {
  programPlans?: PlanProgram[];
  status: ProgramStatus;
  sessions?: ProgramSession[];
  instructor?: Staff;
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
}


