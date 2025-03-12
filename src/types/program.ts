import { Reservation } from "./attendance";
import { MemberPackage, MemberPlan, MemberSubscription } from "./member";

export type Program = {
    id: number;
    name: string;
    description: string | null;
    icon?: string | null | File;
    // benefits?: string[];
    plans: MemberPlan[];
    levels: ProgramLevel[];
    locationId?: number;
    // status: string | null;
    location?: Location;
    planCounts?: string;
    created: Date;
    updated: Date | null;
    deleted: Date | null;
};

export type ProgramLevel = {
    id: number;
    name: string;
    capacity: number;
    minAge: number;
    maxAge: number;
    programId?: number;
    program?: Program;
    parentId: number | null;
    sessions: ProgramSession[];
    memberSubscriptions: MemberSubscription[];
    memberPackages: MemberPackage[];
    created?: Date | null;
    updated?: Date | null;
    deleted?: Date | null;
};


export type ProgramSession = {
    id?: number,
    duration: number,
    programLevelId?: number,
    day: number,
    time: string | undefined,
    created: Date,
    updated?: Date | null,
    programLevel?: ProgramLevel,
    reservations?: Reservation[]
    reservationsCount?: number | null
}


