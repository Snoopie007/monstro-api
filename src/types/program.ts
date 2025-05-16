import { RecurringReservation, Reservation } from "./attendance";
import { MemberPlan } from "./member";
import { Location } from "./location";
import { Interval, ProgramStatus } from "./DatabaseEnums";

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
    deleted: Date | null;
};

export type PlanProgram = {
    planId: number;
    programId: number;
    program?: Program;
    plan?: MemberPlan;
}

export type ProgramSession = {
    recurringReservations?: RecurringReservation[];
    id: number,
    duration: number,
    programId: number,
    day: number,
    time: string,
    created: Date,
    updated?: Date | null,
    program?: Program,
    reservations?: Reservation[]
    reservationsCount?: number | null
}


