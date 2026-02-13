import { planPrograms, programs, programSessions } from "../schemas/programs";
import type { Reservation } from "./attendance";
import type { ProgramStatus } from "./DatabaseEnums";
import type { MemberPlan } from "./member";

export type Program = typeof programs.$inferSelect & {
  programPlans?: PlanProgram[];
  status: ProgramStatus;
  sessions?: ProgramSession[];
};

export type PlanProgram = typeof planPrograms.$inferSelect & {

  program?: Program;
  plan?: MemberPlan;
}

export type ProgramSession = typeof programSessions.$inferSelect & {
  program?: Program,
  reservations?: Reservation[]
  reservationsCount?: number | null

}


export type ExtendedProgramSession = ProgramSession & {
  availability: number;
  isFull: boolean;
  isReserved: boolean;
  planIds: string[];
  startTime: Date;
  endTime: Date;

}