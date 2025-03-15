import { reservations } from "@/db/schemas/reservations";

export type Attendance = {
    id: number;
    checkInTime: Date;
    checkOutTime: Date | null;
    startTime: Date;
    endTime: Date;
    ipAddress: string | null;
    macAddress: string | null;
    lat: number | null;
    lng: number | null;
    created: Date;
    updated: Date | null;
};

export type ExtendedAttendance = Attendance & {
    programName: string;
};

export type Reservation = typeof reservations.$inferInsert