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
    accessorFn: (row) => `${row.firstName} ${row.lastName}`,
    cell: ({ row }) => {
      const member = row.original;
      return (
        <Link
          href={`/dashboard/location/${locationId}/members/${member.id}`}
          className="font-semibold"
        >
          {member.firstName} {member.lastName}
        </Link>
      );
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
      const member = row.original;

      return (
        <Badge member={member.memberLocation?.status} size="tiny">
          {member.memberLocation?.status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => {
      const member = row.original;
      const tags = (member as any).tags || [];

      if (tags.length === 0) {
        return <span className="text-muted-foreground text-xs">No tags</span>;
      }

      return (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag: any) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="text-xs px-1.5 py-0.5"
            >
              {tag.name}
            </Badge>
          ))}
          {tags.length > 3 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0.5">
              +{tags.length - 3}
            </Badge>
          )}
        </div>
      );
    },
    enableSorting: false,
  },
];
