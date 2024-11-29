import { Program } from "./program";

export type Attendance = {
    id: number;
    checkInTime: Date;
    checkOutTime: Date;
    timeToCheckIn: Date;
    program?: Program;
};