import { RecurringReservation, Reservation } from "./attendance";
import { MemberPlan } from "./member";
import { ProgramStatus } from "./DatabaseEnums";
import { planPrograms, programSessions, programs } from "@/db/schemas";

export type Program = typeof programs.$inferInsert & {
    programPlans?: PlanProgram[];
    status: ProgramStatus;
    sessions?: ProgramSession[];
};

export type PlanProgram = typeof planPrograms.$inferInsert & {
    planId: string;
    programId: string;
    program?: Program;
    plan?: MemberPlan;
}

export type ProgramSession = typeof programSessions.$inferInsert & {
    recurringReservations?: RecurringReservation[];
    program?: Program,
    reservations?: Reservation[]
    reservationsCount?: number | null
}


