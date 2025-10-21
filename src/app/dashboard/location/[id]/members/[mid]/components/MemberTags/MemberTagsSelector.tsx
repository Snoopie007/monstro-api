"use client";

import { Skeleton } from "@/components/ui";
import {
	Tags,
	TagsContent,
	TagsEmpty,
	TagsGroup,
	TagsInput,
	TagsItem,
	TagsList,
	TagsTrigger,
	TagsValue,
} from "@/components/ui/kibo-ui/tags";
import { useTags } from "@/hooks/useTags";
import { cn } from "@/libs/utils";
import { CheckIcon, PlusIcon, SquarePen } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";

interface MemberTagsSelectorProps {
	locationId: string;
	selectedTags: string[];
	onTagsChange: (tagIds: string[]) => void;
	canCreateTags?: boolean; // For admin permission control
}

export const MemberTagsSelector = ({
	locationId,
	selectedTags,
	onTagsChange,
	canCreateTags = false,
}: MemberTagsSelectorProps) => {
	const [newTag, setNewTag] = useState<string>("");
	const { tags, isLoading, createTag } = useTags(locationId);
	const handleRemove = (value: string) => {
		if (!selectedTags.includes(value)) {
			return;
		}

		const newSelectedTags = selectedTags.filter((v) => v !== value);
		onTagsChange(newSelectedTags);
	};

	const handleSelect = (value: string) => {
		if (selectedTags.includes(value)) {
			handleRemove(value);
			return;
		}

		const newSelectedTags = [...selectedTags, value];
		onTagsChange(newSelectedTags);
	};

	const handleCreateTag = async () => {
		if (!canCreateTags) {
			toast.error("You don't have permission to create tags");
			return;
		}

		if (!newTag.trim()) {
			return;
		}

		try {
			const createdTag = await createTag({ name: newTag.trim() });
			// Automatically select the newly created tag
			const newSelectedTags = [...selectedTags, createdTag.id];
			onTagsChange(newSelectedTags);
			setNewTag("");
			toast.success(`Tag "${newTag.trim()}" created successfully`);
		} catch (error) {
			// Show user-friendly error message
			if (error instanceof Error) {
				if (error.message.includes("already exists")) {
					toast.error("A tag with this name already exists");
				} else {
					toast.error("Failed to create tag. Please try again.");
				}
			} else {
				toast.error("Failed to create tag. Please try again.");
			}
			// Keep console error for debugging
			console.error("Failed to create tag:", error);
		}
	};

	if (isLoading) {
		return <Skeleton className="h-8 w-full" />;
	}

	return (
		<Tags>
			<TagsTrigger
				className={cn(
					"group border-none p-0 hover:p-1 hover:bg-muted/50 transition-all duration-100",
				)}
				enableTriggerString={false}
			>
				{selectedTags.map((tagId) => (
					<TagsValue key={tagId} onRemove={() => handleRemove(tagId)}>
						{tags.find((t) => t.id === tagId)?.name}
					</TagsValue>
				))}
				<span className="text-muted-foreground ml-1 invisible group-hover:visible transition-all duration-100 ease-in-out float-right justify-end">
					<SquarePen size={14} />
				</span>
			</TagsTrigger>
			<TagsContent className="border-foreground/10 min-w-48">
				<TagsInput onValueChange={setNewTag} placeholder="Search tag..." />
				<TagsList>
					{canCreateTags && newTag.trim() && (
						<TagsEmpty>
							<button
								className="mx-auto flex cursor-pointer items-center gap-2"
								onClick={handleCreateTag}
								type="button"
							>
								<PlusIcon className="text-muted-foreground" size={14} />
								Create new tag: {newTag}
							</button>
						</TagsEmpty>
					)}
					<TagsGroup>
						{tags.map((tag) => (
							<TagsItem key={tag.id} onSelect={handleSelect} value={tag.id}>
								{tag.name}
								{selectedTags.includes(tag.id) && (
									<CheckIcon className="text-muted-foreground" size={14} />
								)}
							</TagsItem>
						))}
					</TagsGroup>
				</TagsList>
			</TagsContent>
		</Tags>
	);
};
