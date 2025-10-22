'use client'
import {
    CommandItem,
    CommandEmpty,
    Command,
    PopoverTrigger,
    Popover,
    CommandList,
    CommandGroup,
    PopoverContent,
    Badge,
    CustomCommandInput,
    Skeleton,
} from '@/components/ui'
import { useMemberTags, useTags } from '@/hooks/useTags'
import { CheckIcon, XIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

export const CustomTagsSelector = ({
    locationId,
    memberId,
}: {
    locationId: string
    memberId: string
}) => {
    const { tags, isLoading, createTag } = useTags(locationId)
    const {
        tags: memberTags,
        isLoading: isMemberTagsLoading,
        updateMemberTags,
        removeMemberTags,
    } = useMemberTags(locationId, memberId)

    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
    const [open, setOpen] = useState<boolean>(false)

    const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id))

    const handleRemove = (tagId: string) => {
        setSelectedTagIds((prev) => prev.filter((t) => t !== tagId))
    }

    const handleSelect = (tagId: string) => {
        if (selectedTagIds.includes(tagId)) {
            handleRemove(tagId)
            return
        }
        setSelectedTagIds((prev) => prev.concat(tagId))
    }

    const handleUpdateTags = async () => {
        if (selectedTagIds.length === 0) {
            await removeMemberTags()
            return
        }
        await updateMemberTags(selectedTagIds)
    }

    useEffect(() => {
        if (
            !isMemberTagsLoading &&
            !isLoading &&
            memberTags &&
            memberTags.length > 0
        ) {
            setSelectedTagIds(memberTags.map((t) => t.id))
        }
    }, [memberTags])

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            handleUpdateTags()
        }, 500) // 500ms debounce delay

        return () => clearTimeout(debounceTimer)
    }, [selectedTagIds])

    if (isMemberTagsLoading || isLoading) {
        return (
            <div>
                <Skeleton className="h-10 w-full mb-2" />
                <div className="flex flex-row gap-2 flex-wrap">
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-5 w-12" />
                </div>
            </div>
        )
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <Command>
                <PopoverTrigger asChild>
                    <CustomCommandInput
                        placeholder="Search tag..."
                        className="mb-3 w-full text-sm h-10 bg-muted/50 "
                        disabled={isMemberTagsLoading || isLoading}
                    />
                </PopoverTrigger>
                <div className="flex flex-row gap-2 flex-wrap">
                    {selectedTags.map((tag) => (
                        <Badge className="bg-indigo-500 py-1 px-3 rounded-sm  text-white" key={tag.id}>
                            {tag.name}
                            <div
                                className="size-auto cursor-pointer hover:text-white"
                                onClick={() => handleRemove(tag.id)}
                            >
                                <XIcon size={12} className="text-white hover:text-red-500" />
                            </div>
                        </Badge>
                    ))}
                </div>
                <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] px-1 py-1 border-foreground/10"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <CommandList>
                        <CommandEmpty>it's empty</CommandEmpty>
                        <CommandGroup>
                            {tags.map((tag) => (
                                <CommandItem
                                    className="flex items-center justify-between"
                                    key={tag.id}
                                    value={tag.id}
                                    onSelect={handleSelect}
                                >
                                    {tag.name}
                                    {selectedTagIds.includes(tag.id) && (
                                        <CheckIcon
                                            className="text-muted-foreground"
                                            size={14}
                                        />
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </PopoverContent>
            </Command>
        </Popover>
    )
}
