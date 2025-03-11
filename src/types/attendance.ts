import { reservations } from "@/db/schemas/reservations";
export type Attendance = {
    id: number;
    checkInTime: Date;
    checkOutTime: Date;
    startTime: Date;
    endTime: Date;
};

export type Reservation = typeof reservations.$inferInsert