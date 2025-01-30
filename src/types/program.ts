import { Plan } from "./plan";

export type Program = {
    id: number;
    name: string;
    description: string | null;
    icon?: string | null | File;
    // benefits?: string[];
    plans: Plan[];
    programLevels?: Level[];
    locationId?: number;
    // status: string | null;
    location?: Location;
    planCounts?: string;
    lastSyncAt: Date | null;
    created: Date;
    updated: Date | null;
    deleted: Date | null;
};

export type Level = {
    id?: number;
    name: string;
    capacity: number;
    minAge: number;
    maxAge: number;
    programId?: number;
    program?: Program;
    parentId?: number;
    sessions: Session[];
    created: Date | null;
    updated: Date | null;
    deleted: Date | null;
};

export type Enrollments = {
    id: number;
    status: number;
    startDate: string;
    endDate: string;
}


export type Session = {
    [key: string]: string | number | undefined | boolean | Array<Enrollments>;
    id?: number,
    durationTime?: number,
    status: boolean,
    duration_time?: string,
    startDate?: string,
    endDate?: string,
    monday?: string | undefined,
    tuesday?: string | undefined,
    wednesday?: string | undefined,
    thursday?: string | undefined,
    friday?: string | undefined,
    saturday?: string | undefined,
    sunday?: string | undefined,
    enrollments?: Array<Enrollments>
}
