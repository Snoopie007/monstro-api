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


export type CalendarEvent = {
    id: string
    title: string
    end: Date
    duration: number
    start: Date
    data: Record<string, unknown>
}


export type CalendarView = 'month' | 'week' | 'day';