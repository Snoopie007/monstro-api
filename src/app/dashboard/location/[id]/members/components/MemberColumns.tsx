import { Checkbox } from "@/components/forms/checkbox";
import { Badge } from "@/components/ui";
import { Member } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export const MemberColumns = (locationId: string): ColumnDef<Member, any>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        className="border-foreground/50 rounded-xs mt-1.5"
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        className="border-foreground/50 rounded-xs mt-1.5"
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Name",
    id: "name",
    accessorFn: row => `${row.firstName} ${row.lastName}`,
    cell: ({ row }) => {
      const member = row.original
      return (

        <Link href={`/dashboard/${locationId}/members/${member.id}`} className="font-semibold">{member.firstName} {member.lastName}</Link>
      )
    },
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const member = row.original

      return (
        <Badge member={member.memberLocation?.status} size="tiny">
          {member.memberLocation?.status}
        </Badge>
      )
    }
  },
];
