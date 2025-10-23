"use client";

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
import { CheckIcon, Loader2, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";

interface TagsFilterProps {
	locationId: string;
	selectedTags: string[];
	onTagsChange: (tagIds: string[]) => void;
	canCreateTags?: boolean; // For admin permission control
	fullWidth?: boolean;
	tagsValueClassName?: string;
}

const TagsFilter = ({
	locationId,
	selectedTags,
	onTagsChange,
	fullWidth = false,
	canCreateTags = false,
	tagsValueClassName = "",
}: TagsFilterProps) => {
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
		return (
			<div className="flex items-center gap-2 h-8 px-3 py-1 bg-foreground/10 rounded-md">
				<Loader2 className="h-4 w-4 animate-spin" />
				<span className="text-sm">Loading tags...</span>
			</div>
		);
	}

	return (
		<Tags className={cn("max-w-[500px]", fullWidth ? "w-full" : undefined)}>
			<TagsTrigger
				className={`border-none bg-foreground/10 hover:bg-foreground/20 hover:text-background shadow-sm ${
					selectedTags.length === 0 ? "h-8" : undefined
				}`}
			>
				{selectedTags.map((tagId) => (
					<TagsValue
						className={cn(
							"bg-foreground/50 hover:bg-foreground/40 dark:bg-background/60 dark:hover:bg-background/80",
							tagsValueClassName,
						)}
						key={tagId}
						onRemove={() => handleRemove(tagId)}
					>
						{tags.find((t) => t.id === tagId)?.name}
					</TagsValue>
				))}
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

export default TagsFilter;
