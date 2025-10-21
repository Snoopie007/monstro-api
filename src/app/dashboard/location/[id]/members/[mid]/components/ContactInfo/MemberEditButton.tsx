'use client'
import { useState } from 'react'
import {
    Button,
    TooltipTrigger,
    TooltipContent,
    Tooltip,
} from '@/components/ui'
import { Edit } from 'lucide-react'
import { EditMemberInfoDialog } from './EditMemberDialog'
import { cn } from '@/libs/utils'

export function MemberEditButton({
    params,
    className
}: {
    params: { id: string; mid: string }
    className?: string
}) {
    const [isEditOpen, setIsEditOpen] = useState(false)

    return (
        <>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("bg-foreground/5 size-7 hover:bg-foreground/10 rounded-none flex-1", className)}
                        onClick={() => setIsEditOpen(true)}
                    >
                        <Edit className="size-3" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Edit this member's contact information</p>
                </TooltipContent>
            </Tooltip>
            <EditMemberInfoDialog
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                params={params}
            />
        </>
    )
}
