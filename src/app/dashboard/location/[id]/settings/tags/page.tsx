"use client";

import { use } from "react";
import { useTags } from "@/hooks/useTags";
import { format } from "date-fns";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
	EmptyDescription,
	Skeleton,
} from "@/components/ui";
import { Tag } from "lucide-react";
import { NewTag } from "./components";
import TagActions from "./components/TagActions";

interface TagsManagementPageProps {
	params: Promise<{ id: string }>;
}

export default function TagsManagementPage(props: TagsManagementPageProps) {
	const params = use(props.params);
	const { tags, isLoading } = useTags(params.id);

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div className="space-y-1">
					<div className='text-xl font-semibold mb-1'>Tags</div>
					<p className='text-sm'>Create and manage custom tags for your members</p>
				</div>
				<NewTag lid={params.id} />
			</div>

			<div className="bg-muted/50 rounded-lg overflow-hidden ">
				{isLoading ? (
					<div className="space-y-2">
						{Array.from({ length: 5 }).map((_, i) => (
							<Skeleton key={i} className="h-12 w-full" />
						))}
					</div>
				) : (
					tags.length === 0 ? (
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<Tag className="size-4" />
								</EmptyMedia>
								<EmptyTitle>No tags created yet</EmptyTitle>
								<EmptyDescription>Create your first tag to get started</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									{["Name", "Used Count", "Created", ""].map((header) => (
										<TableHead key={header}>{header}</TableHead>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>
								{tags.map((tag) => (
									<TableRow key={tag.id}>
										<TableCell>
											{tag.name}
										</TableCell>
										<TableCell className="text-muted-foreground">
											{tag.memberCount || 0}
										</TableCell>
										<TableCell className="text-muted-foreground">
											{format(tag.created, "MMM d, yyyy hh:mm a")}
										</TableCell>
										<TableCell className="flex justify-end">
											<TagActions lid={params.id} tag={tag} />
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)
				)}
			</div>
		</div>
	);
}
