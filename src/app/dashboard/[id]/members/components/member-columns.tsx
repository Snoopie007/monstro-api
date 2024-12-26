import { Member } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export const MemberColumns = (locationId: string): ColumnDef<Member, any>[] => [
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
  // {
  //   accessorKey: "status",
  //   header: "Status",
  // },
];
