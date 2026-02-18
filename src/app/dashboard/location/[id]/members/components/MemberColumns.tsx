import { Checkbox } from "@/components/forms/checkbox";
import { Badge } from "@/components/ui";
import { MemberListItem } from "@/types/member";
import { ColumnDef, FilterFn } from "@tanstack/react-table";
import Link from "next/link";
import {
	CustomFieldDisplay,
} from "@/components/CustomFieldDisplay";
import { CustomFieldDefinition } from "@/types/member";

const customFieldFilter: FilterFn<MemberListItem> = (row, columnId, filterValue) => {
	if (columnId.startsWith('custom-field-')) {
		const fieldId = columnId.replace('custom-field-', '');
		const member = row.original;
		const customFieldValue = member.customFields?.find(
			cf => cf.fieldId === fieldId
		)?.value;

		if (!customFieldValue) return false;

		// Case-insensitive string matching
		return customFieldValue.toLowerCase().includes(filterValue.toLowerCase());
	}
	return false;
};

export const MemberColumns = (
	locationId: string,
	customFields?: CustomFieldDefinition[]
): ColumnDef<MemberListItem, any>[] => {
	const baseColumns: ColumnDef<MemberListItem, any>[] = [
		{
			id: "select",
			header: ({ table }) => (
				<Checkbox
					className="border-foreground/50 mt-1.5"
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
					className="border-foreground/50 mt-1.5"
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
					<Badge member={member.memberLocation?.status as any} >
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
					return <span className="text-muted-foreground">No tags</span>;
				}

				return (
					<div className="flex gap-1 min-w-0">
						{tags.slice(0, 2).map((tag: any) => (
							<Badge key={tag.id} variant="secondary" >
								{tag.name}
							</Badge>
						))}
						{tags.length > 2 && (
							<Badge variant="outline" >
								+{tags.length - 2}
							</Badge>
						)}
					</div>
				);
			},
			enableSorting: false,
		},
	];

	// Generate custom field columns
	const customFieldColumns: ColumnDef<MemberListItem, any>[] =
		customFields?.map((field) => ({
			accessorKey: `custom-field-${field.id}`,
			id: `custom-field-${field.id}`,
			header: field.name,
			filterFn: customFieldFilter,
			cell: ({ row }) => {
				const member = row.original;
				const customFieldValue = member.customFields?.find(
					(cf) => cf.fieldId === field.id
				);

				if (!customFieldValue || !customFieldValue.value) {
					return (
						<span className="text-muted-foreground italic">-</span>
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
