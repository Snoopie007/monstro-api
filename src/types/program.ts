import { Reservation } from "./attedance";
import { MemberPlan } from "./member";

export type Program = {
    id: number;
    name: string;
    description: string | null;
    icon?: string | null | File;
    // benefits?: string[];
    plans: MemberPlan[];
    programLevels?: ProgramLevel[];
    locationId?: number;
    // status: string | null;
    location?: Location;
    planCounts?: string;
    // lastSyncAt: Date | null;
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
    parentId?: number;
    sessions: ProgramSession[];
    created?: Date | null;
    updated?: Date | null;
    deleted?: Date | null;
};


export type ProgramSession = {
    id?: number,
    duration: number,
    status: number,
    day: string,
    time: string | undefined,
    created: Date,
    updated?: Date | null,
    reservations?: Reservation[]
}


