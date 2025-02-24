
import { Badge } from "@/components/ui/badge";
import { cn } from "@/libs/utils";
import { Staff } from "@/types";
import { ColumnDef } from "@tanstack/react-table";

export const StaffColumns = (locationId: string): ColumnDef<Staff, any>[] => [

    {
        accessorKey: "name",
        header: "Name",
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        cell: ({ row }) => {
            const staff = row.original
            return (
                <>
                    {staff.firstName} {staff.lastName}
                </>
            )
        },
    }
    ,
    {
        accessorKey: "email",
        header: "Email",
        accessorFn: (row) => row.email,
    }
    ,
    {
        accessorKey: "phone",
        header: "Phone",
        accessorFn: (row) => row.phone,
    }
    ,
    {
        accessorKey: "role",
        header: "Role",
        accessorFn: (row) => row.role,
        cell: ({ row }) => {
            const staff = row.original
            return (
                <Badge roles={staff.role.color} className='border-0 py-0.5 capitalize rounded-sm'>
                    {staff.role.name}
                </Badge>
            )
        },
    }
    // {
    //   accessorKey: "status",
    //   header: "Status",
    // },
];
