import { attendances, recurringReservations, recurringReservationsExceptions, reservations } from "@/db/schemas";
import { ProgramSession } from "@/types/program";
import { Member } from "./member";


export type Attendance = typeof attendances.$inferSelect & {

    recurring?: RecurringReservation
    reservation?: Reservation

};

export type ExtendedAttendance = Attendance & {
    programName: string;
};

export type Reservation = typeof reservations.$inferSelect & {
    isRecurring?: boolean;
    recurringId?: string;
    session?: ProgramSession
    member?: Member
    exceptions?: RecurringReservationException[]
}

export type RecurringReservation = typeof recurringReservations.$inferSelect & {
    session?: ProgramSession
    location?: Location
    member?: Member
    exceptions?: RecurringReservationException[]
}

export type RecurringReservationException = typeof recurringReservationsExceptions.$inferSelect & {
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

export type CalendarEventData = {
    reservationId?: number
    recurringId?: number
    programId: number
    sessionId: number
    members: CalendarEventMember[]
    isRecurring: boolean
    memberPlanId?: number
}


export type CalendarEventMember = {
    memberId?: number
    name: string
    avatar?: string | null
}

export type CalendarView = 'month' | 'week' | 'day';