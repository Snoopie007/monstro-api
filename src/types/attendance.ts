import { recurringReservations, recurringReservationsExceptions, reservations } from "@/db/schemas/reservations";
import { ProgramSession } from "@/types/program";
import { Member } from "./member";

export type Attendance = {
    id: number;
    reservationId: number | null;
    recurringId: number | null;
    checkInTime: Date;
    checkOutTime: Date | null;
    startTime: Date;
    endTime: Date;
    recurring?: RecurringReservation
    reservation?: Reservation
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

export type Reservation = typeof reservations.$inferInsert & {
    isRecurring?: boolean;
    recurringId?: number;
    session?: ProgramSession
    member?: Member
}

export type RecurringReservation = typeof recurringReservations.$inferInsert & {
    session?: ProgramSession
    location?: Location
    member?: Member
    exceptions?: RecurringReservationException[]
}

export type RecurringReservationException = typeof recurringReservationsExceptions.$inferInsert & {
    recurring?: RecurringReservation
    reservation?: Reservation
}


export type CalendarEvent = {
    id: string
    title: string
    end: Date
    duration: number
    start: Date
    data: CalendarEventData
}

type CalendarEventData = {
    reservationId?: number
    recurringId?: number
    programId: number
    sessionId: number
    members: CalendarEventMember[]
    isRecurring: boolean
    memberPlanId?: number
}


type CalendarEventMember = {
    memberId?: number
    name: string
    avatar?: string | null
}

export type CalendarView = 'month' | 'week' | 'day';