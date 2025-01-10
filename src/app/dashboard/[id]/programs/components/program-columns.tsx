
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

    }

    // {
    //   accessorKey: "status",
    //   header: "Status",
    // },
];
