import { Member } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export const ProgramMemberColumns = (lid: string): ColumnDef<Member>[] => [
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
			return (
				<div></div>
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
		accessorKey: "referralCode",
		header: "Referral Code",
	},
	{
		accessorKey: "status",
		header: "Status",
	},
];
