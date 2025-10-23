import { Member } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import {
  CustomFieldDisplay,
  type CustomFieldDefinition,
} from "@/app/dashboard/location/[id]/members/[mid]/components/CustomFields";

interface MemberWithCustomFields extends Member {
  customFields?: Array<{
    fieldId: string;
    value: string;
  }>;
}

export const ProgramMemberColumns = (
  lid: string,
  customFields?: CustomFieldDefinition[]
): ColumnDef<MemberWithCustomFields>[] => {
  const baseColumns: ColumnDef<MemberWithCustomFields>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const member = row.original;
        return (
          <Link href={`/dashboard/${lid}/members/${member.id}`}>
            {member.firstName} {member.lastName}
          </Link>
        );
      },
    },
    {
      accessorKey: "level",
      header: "Level",
      cell: ({ row }) => {
        const member = row.original;
        return <div></div>;
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
      accessorKey: "referralCode",
      header: "Referral Code",
    },
    {
      accessorKey: "status",
      header: "Status",
    },
  ];

  // Generate custom field columns
  const customFieldColumns: ColumnDef<MemberWithCustomFields>[] =
    customFields?.map((field) => ({
      id: `custom-field-${field.id}`,
      header: field.name,
      cell: ({ row }) => {
        const member = row.original;
        const customFieldValue = member.customFields?.find(
          (cf) => cf.fieldId === field.id
        );

        if (!customFieldValue || !customFieldValue.value) {
          return (
            <span className="text-muted-foreground text-xs italic">-</span>
          );
        }

        return (
          <div className="max-w-[150px] truncate">
            <CustomFieldDisplay
              field={field}
              value={customFieldValue.value}
              showLabel={false}
              variant="compact"
            />
          </div>
        );
      },
      enableSorting: false,
      size: 150,
    })) || [];

  return [...baseColumns, ...customFieldColumns];
};
