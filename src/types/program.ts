import { Plan } from "./plan";

export type Program = {
    id: number;
    name: string;
    description: string;
    icon?: string | null | File;
    benefits: string[];
    plans: Plan[];
    programLevels?: Level[];
    locationId?: string;
    status: string | null;
    location?: any;
    planCounts?: string;
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
};


export type Session = {
    [key: string]: string | number | undefined;
    id?: number,
    durationTime?: number,
    startDate?: string,
    endDate?: string,
    monday?: string | undefined,
    tuesday?: string | undefined,
    wednesday?: string | undefined,
    thursday?: string | undefined,
    friday?: string | undefined,
    saturday?: string | undefined,
    sunday?: string | undefined,
}
