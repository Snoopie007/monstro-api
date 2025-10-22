'use client'
import {
    Button,
    CardTitle,
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
    Badge,
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription,
} from '@/components/ui'
import { useMemberTags } from '@/hooks/useTags'
import { ChevronsUpDown, Loader2, Tag, XIcon } from 'lucide-react'
import { useState } from 'react'
import { CustomTagsSelector } from './CustomTagsSelector'
import { MemberTag } from '@/types'
import { tryCatch } from '@/libs/utils'
import { toast } from 'react-toastify'
interface MemberTagsBoxProps {
    params: { id: string; mid: string }
    editable: boolean
}

export function MemberTagsBox({ params, editable }: MemberTagsBoxProps) {
    const [open, setOpen] = useState<boolean>(true)

    const { memberTags, mutate } = useMemberTags(params.id, params.mid)

    async function handleUpdate(tagId: string) {
        await mutate()
    }



    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-transparent gap-1 px-0"
                >
                    <CardTitle className="text-sm font-medium mb-0">
                        Member Tags
                    </CardTitle>
                    <ChevronsUpDown className="size-4" />
                    <span className="sr-only">Toggle</span>
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <CustomTagsSelector params={params} selectedTag={memberTags} onUpdate={handleUpdate} editable={editable} />

                {memberTags.length === 0 ? (
                    <Empty variant="border">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Tag className="size-4" />
                            </EmptyMedia>
                            <EmptyTitle>No tags found</EmptyTitle>
                            <EmptyDescription>Add a tag to the member.</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <div className="flex flex-row gap-2 flex-wrap">
                        {memberTags.map((tag) => (
                            <MemberTagItem key={tag.id} tag={tag} params={params} editable={editable} onUpdate={handleUpdate} />
                        ))}
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>
    )
}

interface MemberTagItemProps {
    tag: MemberTag
    params: { id: string, mid: string }
    editable: boolean
    onUpdate: (tagId: string) => void
}

function MemberTagItem({ tag, params, editable, onUpdate }: MemberTagItemProps) {
    const [loading, setLoading] = useState<boolean>(false)

    async function handleRemove(tagId: string) {
        if (!editable || loading || !tagId) return
        setLoading(true)
        const { error, result } = await tryCatch(fetch(`/api/protected/loc/${params.id}/members/${params.mid}/tags`, {
            method: 'DELETE'
        }))
        if (error || !result || !result.ok) {
            toast.error(error?.message || 'Failed to remove tag')
            return
        }
        await onUpdate(tagId)
        setLoading(false)
    }
    return (
        <Badge className="bg-indigo-500 py-1 px-3 rounded-sm  text-white">
            {tag.name}
            <div
                className="size-auto cursor-pointer hover:text-white"
                onClick={() => handleRemove(tag.id)}
            >
                {loading ? (
                    <Loader2 size={12} className="text-white hover:text-red-500 animate-spin" />
                ) : (
                    <XIcon size={12} className="text-white hover:text-red-500" />
                )}
            </div>
        </Badge>
    )
}