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
    id?: number;
    name: string;
    capacity: number;
    minAge: number;
    maxAge: number;
    programId?: number;
    program?: Program;
    parentId?: number;
    sessions: ProgranSession[];
    created?: Date | null;
    updated?: Date | null;
    deleted?: Date | null;
};


export type ProgranSession = {
    [key: string]: string | number | undefined | boolean | Reservation[] | Record<string, number>;
    id?: number,
    durationTime?: Record<string, number>,
    status: number,
    duration_time?: string,
    monday?: string | undefined,
    tuesday?: string | undefined,
    wednesday?: string | undefined,
    thursday?: string | undefined,
    friday?: string | undefined,
    saturday?: string | undefined,
    sunday?: string | undefined,
    reservations?: Reservation[]
}


