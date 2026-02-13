import type { Reservation } from "./attendance";
import type { MemberPlan } from "./member";
import type { ProgramStatus } from "./DatabaseEnums";
import { planPrograms, programs, programSessions } from "../schemas/programs";
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
