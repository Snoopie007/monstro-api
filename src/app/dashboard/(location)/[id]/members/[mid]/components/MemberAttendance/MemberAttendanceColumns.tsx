import { ExtendedAttendance } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { format, isBefore } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/libs/utils";

export const MemberAttendanceColumns: ColumnDef<ExtendedAttendance>[] = [
    {
        accessorKey: "programName",
        header: "Program"
    },
    {
        accessorKey: "classTime",
        header: "Class Time",
        cell: ({ row }) => {
            const attendance = row.original
            return (
                <span>{format(attendance.startTime, "MMM d, yyyy hh:mm a")} - {format(attendance.endTime, "MMM d, yyyy hh:mm a")}</span>
            )
        },
    },
    {
        accessorKey: "checkInTime",
        header: "Checked In",
        cell: ({ row }) => {
            const attendance = row.original
            return (
                <span>{format(attendance.checkInTime, "MMM d, yyyy hh:mm a")}</span>
            )
        },

    },
    {
        accessorKey: "checkOutTime",
        header: "Check Out",
        cell: ({ row }) => {
            const attendance = row.original
            return (
                <span>{attendance.checkOutTime ? format(attendance.checkOutTime, "MMM d, yyyy hh:mm a") : "N/A"}</span>
            )
        }
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const attendance = row.original
            const isLate = isBefore(attendance.checkInTime, attendance.startTime)
            return <Badge className={cn(isLate ? "bg-red-500" : "bg-green-500")}>
                {isLate ? "Late" : "On Time"}
            </Badge>
        }
    }
];