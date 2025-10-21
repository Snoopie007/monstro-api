"use client";
import {
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui";
import { useMemberTags } from "@/hooks/useTags";
import { ChevronsUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import { MemberTagsSelector } from "./MemberTagsSelector";

interface MemberTagSectionProps {
	params: { id: string; mid: string };
	editable: boolean;
}

export function MemberTagSection({ params, editable }: MemberTagSectionProps) {
	const { tags: memberTags, updateMemberTags } = useMemberTags(
		params.id,
		params.mid,
	);

	const [open, setOpen] = useState(true);
	const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

	// Initialize selected tags when member tags load or dialog opens
	useEffect(() => {
		if (memberTags && memberTags.length > 0 && selectedTagIds.length === 0) {
			setSelectedTagIds(memberTags.map((tag) => tag.id));
		}
	}, [memberTags, selectedTagIds]);

	const onTagsChange = async (tagIds: string[]) => {
		setSelectedTagIds(tagIds);
		await updateMemberTags(tagIds);
	};

	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<Card className=" rounded-lg border-muted/50">
				<CardHeader className="px-4 py-2 space-y-0 flex flex-row justify-between items-center">
					<CollapsibleTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className="hover:bg-transparent gap-1 px-0"
						>
							<CardTitle className="text-sm font-medium mb-0">Tags</CardTitle>
							<ChevronsUpDown className="size-4" />
							<span className="sr-only">Toggle</span>
						</Button>
					</CollapsibleTrigger>
				</CardHeader>

				<CollapsibleContent>
					<CardContent className="px-4 pb-6 pt-1">
						<MemberTagsSelector
							locationId={params.id}
							selectedTags={selectedTagIds}
							onTagsChange={onTagsChange}
							canCreateTags={editable}
						/>
					</CardContent>
				</CollapsibleContent>
			</Card>
		</Collapsible>
	);
}
