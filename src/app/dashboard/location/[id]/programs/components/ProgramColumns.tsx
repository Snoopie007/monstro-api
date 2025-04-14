
import { Badge } from "@/components/ui/badge";
import { cn } from "@/libs/utils";
import { Program } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export const ProgramColumns = (locationId: string): ColumnDef<Program, any>[] => [
    {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => {
            const program = row.original
            return (
                <Link href={`/dashboard/${locationId}/programs/${program.id}`} className="" >
                    {program.name}
                </Link>
            )
        },
    },
    {
        accessorKey: "planCounts",
        header: "Plans",

    },
    {
        accessorKey: "Age Range",
        header: "Age Range",
        cell: ({ row }) => {
            const program = row.original
            return `${program.minAge} - ${program.maxAge}`
        }
    },
    {
        accessorKey: "capacity",
        header: "Capacity"
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const program = row.original
            return <Badge variant={program.status} size="tiny">{program.status}</Badge>
        }
    }

    // {
    //   accessorKey: "status",
    //   header: "Status",
    // },
];
