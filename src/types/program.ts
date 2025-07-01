<<<<<<< HEAD
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


=======
import {RecurringReservation, Reservation} from "./attendance";
import {MemberPlan} from "./member";
import {Location} from "./location";
import {Interval, ProgramStatus} from "./DatabaseEnums";

export type Program = {
  id: number;
  name: string;
  description: string | null;
  icon?: string | null | File;
  capacity: number;
  minAge: number;
  maxAge: number;
  instructorId: number | null;
  interval: Interval;
  intervalThreshold: number;
  programPlans?: PlanProgram[];
  locationId?: number;
  status: ProgramStatus;
  location?: Location;
  planCounts?: string;
  sessions?: ProgramSession[];
  allowWaitlist: boolean;
  waitlistCapacity: number;
  allowMakeUpClass: boolean;
  cancelationThreshold: number;
  created: Date;
  updated: Date | null;
};

export type PlanProgram = {
  planId: number;
  programId: number;
  program?: Program;
  plan?: MemberPlan;
};

export type ProgramSession = {
  recurringReservations?: RecurringReservation[];
  id: number;
  duration: number;
  programId: number;
  day: number;
  time: string;
  created: Date;
  updated?: Date | null;
  program?: Program;
  reservations?: Reservation[];
  reservationsCount?: number | null;
};
>>>>>>> 22125ebf9f92d05da0f1397f845bbaa8d79a1fe6
