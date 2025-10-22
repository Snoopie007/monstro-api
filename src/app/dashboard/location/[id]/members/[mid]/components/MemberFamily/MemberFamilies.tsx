'use client'
import { ItemContent, Item, ItemMedia, ItemTitle, ItemDescription, ItemActions } from '@/components/ui'
import { useMemberStatus } from '../../providers/MemberContext'
import { FamilyMember } from '@/types/FamilyMember'
import AddChildMember from './AddMember'
import {
    CardTitle,
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
    Button,
} from '@/components/ui'
import { useState } from 'react'
import { ChevronsUpDown, X } from 'lucide-react'
import Image from 'next/image'

interface MemberFamiliesProps {
    params: { id: string; mid: string }
    familyMembers: FamilyMember[] | undefined
    editable: boolean
}

export function MemberFamilies({
    params,
    familyMembers,
    editable,
}: MemberFamiliesProps) {
    const [open, setOpen] = useState<boolean>(true)
    const { member } = useMemberStatus()

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <div className=' space-y-0 flex flex-row justify-between items-center'>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="hover:bg-transparent gap-1 px-0">
                        <CardTitle className='text-sm font-medium mb-0'>Family Members</CardTitle>
                        <ChevronsUpDown className="size-4" />
                        <span className="sr-only">Toggle</span>
                    </Button>
                </CollapsibleTrigger>
                {editable && (
                    <AddChildMember parent={member} lid={params.id} />
                )}
            </div>

            <CollapsibleContent  >
                {familyMembers && familyMembers.length > 0 ? (
                    <div className="space-y-2">
                        {familyMembers.map((fm) => (
                            <FamilyMemberItem key={fm.id} familyMember={fm} />
                        ))}
                    </div>
                ) : (
                    <div className='flex flex-col items-center justify-center'>
                        <p className=" text-center text-muted-foreground">No family members found</p>
                        {editable && (
                            <AddChildMember parent={member} lid={params.id} />
                        )}
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible >
    )
}

function FamilyMemberItem({ familyMember }: { familyMember: FamilyMember }) {
    const avatar = familyMember.relatedMember?.avatar || '/images/default-avatar.png'
    const relatedMember = familyMember.relatedMember;
    return (
        <Item variant="muted" className="p-3 gap-2">
            <ItemMedia>
                <Image src={avatar} alt={relatedMember?.firstName || ''} width={28} height={28}
                    className='rounded-full object-cover' />
            </ItemMedia>
            <ItemContent className=" flex-1 gap-0">
                <ItemTitle className="flex flex-row items-center gap-2">
                    {relatedMember?.firstName}{' '}
                    {relatedMember?.lastName}
                    <span className=" text-muted-foreground">
                        {familyMember.relationship}


                    </span>

                </ItemTitle>
            </ItemContent>
            <ItemActions>
                <Button variant="ghost" size="icon" className="size-6 text-red-500 hover:bg-foreground/5 hover:text-red-500">
                    <X className="size-4" />
                </Button>
            </ItemActions>
        </Item>
    )
}