'use client'
import {
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui'
import { useMemberTags } from '@/hooks/useTags'
import { ChevronsUpDown, EditIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CustomTagsSelector } from './CustomTagsSelector'

interface MemberTagsBoxProps {
    params: { id: string; mid: string }
    editable: boolean
}

export function MemberTagsBox({ params, editable }: MemberTagsBoxProps) {
    const { tags: memberTags, updateMemberTags } = useMemberTags(
        params.id,
        params.mid
    )

    const [open, setOpen] = useState<boolean>(true)
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

    // Initialize selected tags when member tags load or dialog opens
    useEffect(() => {
        if (
            memberTags &&
            memberTags.length > 0 &&
            selectedTagIds.length === 0
        ) {
            setSelectedTagIds(memberTags.map((tag) => tag.id))
        }
    }, [memberTags, selectedTagIds])

    const onTagsChange = async (tagIds: string[]) => {
        setSelectedTagIds(tagIds)
        await updateMemberTags(tagIds)
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
                        Tags
                    </CardTitle>
                    <ChevronsUpDown className="size-4" />
                    <span className="sr-only">Toggle</span>
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className='pt-1 pb-6'>
                <CustomTagsSelector
                    locationId={params.id}
                    memberId={params.mid}
                />
            </CollapsibleContent>
        </Collapsible>
    )
}
