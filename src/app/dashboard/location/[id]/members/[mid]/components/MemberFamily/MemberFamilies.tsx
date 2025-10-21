'use client'
import { Avatar, AvatarImage } from '@/components/ui'
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
import { ChevronsUpDown } from 'lucide-react'

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

            <CollapsibleContent className='bg-muted/50 rounded-lg p-4' >
                {familyMembers && familyMembers.length > 0 ? (
                    <ul className="space-y-6">
                        {familyMembers.map((fm) => (
                            <FamilyMemberItem key={fm.id} familyMember={fm} />
                        ))}
                    </ul>
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
    return (
        <li key={familyMember.id} className="flex flex-row gap-4 items-center">
            <Avatar className="size-8 flex-initial">
                <AvatarImage src={avatar} />
            </Avatar>
            <div className="space-y-0 flex-1">
                <div className="font-medium text-sm">
                    {familyMember.relatedMember?.firstName}{' '}
                    {familyMember.relatedMember?.lastName}
                </div>
                <div className='text-xs leading-none'>
                    <span className=" text-muted-foreground">
                        {familyMember.relationship}


                    </span>

                </div>
            </div>

        </li>
    )
}