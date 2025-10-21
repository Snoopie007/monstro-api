'use client'
import { Button } from '@/components/ui'
import { useMemberTags, useTags } from '@/hooks/useTags'
import { useEffect, useState } from 'react'

import { toast } from 'react-toastify'
import { Badge } from '@/components/ui/badge'
import { ManageTagsDialog } from './MemberTags/ManageTagsDialog'
import { PlusIcon, ChevronsUpDown } from 'lucide-react'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui'
import { tr } from 'date-fns/locale'

interface MemberTagSectionProps {
    params: { id: string; mid: string }
    editable: boolean
}

export function MemberTagSection({ params, editable }: MemberTagSectionProps) {
    const {
        tags: allTags,
        isLoading: isLoadingAllTags,
        createTag,
    } = useTags(params.id)
    const {
        tags: memberTags,
        isLoading: isLoadingMemberTags,
        updateMemberTags,
    } = useMemberTags(params.id, params.mid)

    const [open, setOpen] = useState(true)
    const [isManageDialogOpen, setIsManageDialogOpen] = useState(false)
    const [isUpdatingTags, setIsUpdatingTags] = useState(false)
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
    const [newTag, setNewTag] = useState('')

    // Initialize selected tags when member tags load or dialog opens
    useEffect(() => {
        if (isManageDialogOpen) {
            setSelectedTagIds(memberTags.map((tag) => tag.id))
        }
    }, [memberTags, isManageDialogOpen])

    const handleRemove = (tagId: string) => {
        const newSelectedTags = selectedTagIds.filter((id) => id !== tagId)
        setSelectedTagIds(newSelectedTags)
    }

    const handleSelect = (value: string) => {
        let newSelectedTags
        if (selectedTagIds.includes(value)) {
            newSelectedTags = selectedTagIds.filter((id) => id !== value)
        } else {
            newSelectedTags = [...selectedTagIds, value]
        }
        setSelectedTagIds(newSelectedTags)
    }

    const handleCreateTag = async () => {
        if (!newTag.trim()) return

        try {
            const createdTag = await createTag({ name: newTag.trim() })
            // Add the new tag to selected tags
            const newSelectedTags = [...selectedTagIds, createdTag.id]
            setSelectedTagIds(newSelectedTags)
            setNewTag('')
            toast.success(`Tag "${newTag.trim()}" created`)
        } catch (error) {
            // Show user-friendly error message
            if (error instanceof Error) {
                if (error.message.includes('already exists')) {
                    toast.error('A tag with this name already exists')
                } else {
                    toast.error('Failed to create tag. Please try again.')
                }
            } else {
                toast.error('Failed to create tag. Please try again.')
            }
            console.error('Failed to create tag:', error)
        }
    }

    const handleSaveTags = async () => {
        setIsUpdatingTags(true)
        try {
            await updateMemberTags(selectedTagIds)
            setIsManageDialogOpen(false)
            toast.success('Member tags updated successfully')
        } catch (error) {
            toast.error('Failed to update tags. Please try again.')
            console.error('Failed to update tags:', error)
        } finally {
            setIsUpdatingTags(false)
        }
    }

    const openManageDialog = () => {
        setSelectedTagIds(memberTags.map((tag) => tag.id))
        setNewTag('')
        setIsManageDialogOpen(true)
    }



    return (
        <>
            <Collapsible open={open} onOpenChange={setOpen}>
                <Card className=' rounded-lg border-muted/50'>
                    <CardHeader className='px-4 py-2 space-y-0 flex flex-row justify-between items-center'>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="hover:bg-transparent gap-1 px-0">
                                <CardTitle className='text-sm font-medium mb-0'>Tags</CardTitle>
                                <ChevronsUpDown className="size-4" />
                                <span className="sr-only">Toggle</span>
                            </Button>
                        </CollapsibleTrigger>

                    </CardHeader>

                    <CollapsibleContent>
                        <CardContent className='px-4 pb-6 pt-1'>
                            {memberTags && memberTags.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {memberTags.map((tag) => (
                                        <TagItem key={tag.id} tag={tag} />
                                    ))}
                                </div>
                            ) : (
                                <div className='flex flex-col items-center justify-center'>
                                    <p className="text-center text-muted-foreground">No tags found</p>

                                </div>
                            )}
                        </CardContent>
                    </CollapsibleContent>
                </Card>
            </Collapsible>
            {/* <ManageTagsDialog
                isManageDialogOpen={isManageDialogOpen}
                setIsManageDialogOpen={setIsManageDialogOpen}
                openManageDialog={openManageDialog}
                selectedTagIds={selectedTagIds}
                allTags={allTags}
                handleRemove={handleRemove}
                newTag={newTag}
                setNewTag={setNewTag}
                handleCreateTag={handleCreateTag}
                handleSaveTags={handleSaveTags}
                isUpdatingTags={isUpdatingTags}
                handleSelect={handleSelect}
            /> */}
        </>
    )
}



function TagItem({ tag }: { tag: { id: string; name: string } }) {

    async function handleRemove() {

    }
    return (
        <Badge variant="secondary" className=" cursor-pointer px-2 "
        >
            {tag.name}
            <span className="text-muted-foreground" onClick={handleRemove}>x</span>
        </Badge>
    )
}
