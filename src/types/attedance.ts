import { Member } from "./member";
import { Program, ProgranSession } from "./program";

export type Attendance = {
    id: number;
    checkInTime: Date;
    checkOutTime: Date;
    timeToCheckIn: Date;
    program?: Program;
};

export type Reservation = {
    id: number;
    status: number;
    startDate: string;
    endDate: string;
    session: ProgranSession;
    member: Member;
};
