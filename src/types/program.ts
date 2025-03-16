import { Reservation } from "./attendance";
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
    benefits: string[] | null;
    plans: MemberPlan[];
    locationId?: number;
    status: ProgramStatus;
    location?: Location;
    planCounts?: string;
    sessions?: ProgramSession[];
    created: Date;
    updated: Date | null;
    deleted: Date | null;
};

export type ProgramSession = {
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


