import { Badge } from "@/components/ui/badge";
import { StaffRowData } from "@/hooks/useStaffs";
import { cn } from "@/libs/utils";
import { Staff } from "@/types";
import { ColumnDef } from "@tanstack/react-table";

export const StaffColumns = (): ColumnDef<StaffRowData, any>[] => [
  {
    accessorKey: "name",
    header: "Name",
    accessorFn: (row) => row.name,
    cell: ({ row }) => {
      const staff = row.original;
      return <>{staff.name}</>;
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    accessorFn: (row) => row.email,
  },
  {
    accessorKey: "phone",
    header: "Phone",
    accessorFn: (row) => row.phone,
  },
  {
    accessorKey: "role",
    header: "Role",
    accessorFn: (row) => row.role,
    cell: ({ row }) => {
      const staff = row.original;
      return (
        <Badge
          roles={staff.roleColor}
          className="border-0 py-0.5 capitalize rounded-sm"
        >
          {staff.role}
        </Badge>
      );
    },
  },
  // {
  //   accessorKey: "status",
  //   header: "Status",
  // },
];
