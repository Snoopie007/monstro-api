import { RecurringReservation, Reservation } from "./attendance";
import { MemberPlan } from "./member";
import { ProgramStatus } from "./DatabaseEnums";
import { planPrograms, programSessions, programs } from "@/db/schemas";

export type Program = typeof programs.$inferSelect & {
  programPlans?: PlanProgram[];
  status: ProgramStatus;
  sessions?: ProgramSession[];
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
}


