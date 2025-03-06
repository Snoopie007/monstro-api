import { reservations } from "@/db/schemas/reservations";
import { MemberSubscription, MemberPackage } from "./member";
import { ProgramSession } from "./program";

export type Attendance = {
    id: number;
    checkInTime: Date;
    checkOutTime: Date;
    startTime: Date;
    endTime: Date;
};

export type Reservation = typeof reservations.$inferInsert