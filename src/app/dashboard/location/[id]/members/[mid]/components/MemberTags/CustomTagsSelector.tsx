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
    CustomCommandInput,
} from '@/components/ui'
import { tryCatch } from '@/libs/utils'
import { MemberTag } from '@subtrees/types'
import { CheckIcon, Loader2, PlusCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'react-toastify'

interface Props {
    params: { id: string; mid: string }
    selectedTag: MemberTag[]
    onUpdate: (tagId: string) => Promise<void>
    editable: boolean
}

export function CustomTagsSelector({
    params,
    selectedTag,
    onUpdate,
    editable,
}: Props) {
    const [tags, setTags] = useState<MemberTag[]>([])
    const [open, setOpen] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [hasFetchedTags, setHasFetchedTags] = useState<boolean>(false)
    const [newTagName, setNewTagName] = useState<string>('')

    async function handleOpenChange(open: boolean) {
        setOpen(open)
        if (open && tags.length === 0 && !hasFetchedTags) {
            setLoading(true)
            const { error, result } = await tryCatch(
                fetch(`/api/protected/loc/${params.id}/tags`)
            )
            setLoading(false)
            if (error || !result || !result.ok) return
            setHasFetchedTags(true)
            const data = await result.json()
            setTags(data)
        }
    }

    async function handleSelect(tagId: string) {
        if (!editable || loading || !tagId) return
        if (selectedTag.some((tag) => tag.id === tagId)) return
        const { error, result } = await tryCatch(
            fetch(
                `/api/protected/loc/${params.id}/members/${params.mid}/tags`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        tagId: tagId,
                    }),
                }
            )
        )
        if (error || !result || !result.ok) {
            setOpen(false)
            toast.error(error?.message || 'Failed to select tag')
            return
        }
        setOpen(false)
        await onUpdate(tagId)
    }

    async function handleCreateTag() {
        if (!editable || loading || !newTagName.trim()) return

        setIsLoading(true)
        const { error, result } = await tryCatch(
            fetch(`/api/protected/loc/${params.id}/tags`, {
                method: 'POST',
                body: JSON.stringify({ name: newTagName.trim() }),
            })
        )
        if (error || !result || !result.ok) {
            setIsLoading(false)
            toast.error(error?.message || 'Failed to create tag')
            return
        }
        const data = await result.json()

        const { error: addTagError, result: addTagResult } = await tryCatch(
            fetch(
                `/api/protected/loc/${params.id}/members/${params.mid}/tags`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        tagId: data.id,
                    }),
                }
            )
        )

        if (addTagError || !addTagResult || !addTagResult.ok) {
            setIsLoading(false)
            toast.error(addTagError?.message || 'Failed to add tag to member')
            return
        }
        setIsLoading(false)
        setTags([...tags, data])
        setNewTagName('')
        setOpen(false)
        await onUpdate(data.id)
    }

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <Command>
                <PopoverTrigger asChild>
                    <CustomCommandInput
                        placeholder="Search tag..."
                        className="mb-3 w-full text-sm h-10 bg-muted/50 "
                        value={newTagName}
                        onValueChange={(value) => setNewTagName(value)}
                        disabled={loading}
                    />
                </PopoverTrigger>

                <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] px-1 py-1 border-foreground/10"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <CommandList>
                        <CommandEmpty className="py-2">
                            <div
                                className="flex items-center gap-1 px-2 text-foreground cursor-pointer"
                                onClick={handleCreateTag}
                            >
                                {isLoading ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <PlusCircle className="size-4 " />
                                )}
                                <span className="text-sm font-medium">
                                    No tag found create one:{' '}
                                    <span className="text-indigo-500 font-bold">
                                        {newTagName}
                                    </span>
                                </span>
                            </div>
                        </CommandEmpty>
                        <CommandGroup>
                            {loading ? (
                                <CommandItem className="text-sm">
                                    Loading...
                                </CommandItem>
                            ) : (
                                tags.map((tag) => (
                                    <CommandItem
                                        className="flex items-center justify-between"
                                        key={tag.id}
                                        value={tag.id}
                                        onSelect={() => handleSelect(tag.id)}
                                    >
                                        {tag.name}
                                        {selectedTag.some(
                                            (t) => t.id === tag.id
                                        ) && (
                                            <CheckIcon
                                                className="text-muted-foreground"
                                                size={14}
                                            />
                                        )}
                                    </CommandItem>
                                ))
                            )}
                        </CommandGroup>
                    </CommandList>
                </PopoverContent>
            </Command>
        </Popover>
    )
}
