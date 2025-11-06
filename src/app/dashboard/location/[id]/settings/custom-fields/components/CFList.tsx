"use client";

import {
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
	EmptyDescription,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TableHeader,
} from "@/components/ui";
import { Tag } from "lucide-react";
import { useState } from "react";
import CFActions from "./CFActions";
import { MemberField } from "@/types";

interface CustomFieldsListProps {
	lid: string;
	initialFields: MemberField[];
}

export function CustomFieldsList({ lid, initialFields }: CustomFieldsListProps) {
	const [fields, setFields] = useState<MemberField[]>(initialFields);

	return (
		<div className="space-y-6">
			<div>
				{fields.length === 0 ? (
					<Empty variant="border">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<Tag className="size-4" />
							</EmptyMedia>
							<EmptyTitle>No custom fields found</EmptyTitle>
							<EmptyDescription>
								Add a custom field to the member.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					<div className="bg-muted/50 rounded-lg overflow-hidden ">
						<Table>
							<TableHeader>
								<TableRow className="border-foreground/5">
									<TableHead>Name</TableHead>
									<TableHead>Type</TableHead>
									<TableHead className="w-2/12 text-right"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{fields.map((field, index) => (
									<TableRow key={field.id ?? index} className="border-foreground/5">
										<TableCell className="font-medium">{field.name}</TableCell>
										<TableCell className="text-muted-foreground">{field.type}</TableCell>
										<TableCell className="text-right">
											<CFActions field={field} />
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</div>
		</div>
	);
}
