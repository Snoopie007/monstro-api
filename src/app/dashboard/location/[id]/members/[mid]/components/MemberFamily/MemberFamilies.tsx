'use client'
import {
    Card,
    CardHeader,
    CardContent,
    CardTitle,
    Avatar,
    AvatarImage,
    AvatarFallback,
    Badge,
} from '@/components/ui'
import { useMemberStatus } from '../../providers/MemberContext'
import { FamilyMember } from '@/types/FamilyMember'
import AddChildMember from './AddMember'
import { Item, ItemContent } from '@/components/ui/item'
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from '@/components/ui/hover-card'

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
    const { member } = useMemberStatus()

    return (
        <div className="px-4 mb-4">
            <div className="flex flex-row items-center gap-2 mb-2">
                <h2 className="text-md font-normal">Family</h2>
                {editable && <AddChildMember parent={member} lid={params.id} />}
            </div>
            <ul className="flex flex-row gap-2 flex-wrap">
                {familyMembers &&
                    familyMembers.map((fm, i) => (
                        <li key={i}>
                            <HoverCard>
                                <HoverCardTrigger>
                                    <Badge
                                        variant="secondary"
                                        className="text-sm"
                                    >
                                        {fm.relatedMember?.firstName}{' '}
                                        {fm.relatedMember?.lastName}
                                    </Badge>
                                </HoverCardTrigger>
                                <HoverCardContent>
                                    <div className="flex flex-row gap-4 items-center">
                                        <div>
                                            <Avatar className="w-[35px] h-[35px] rounded-full mx-auto">
                                                <AvatarImage
                                                    src={
                                                        fm.relatedMember
                                                            ?.avatar || ''
                                                    }
                                                />
                                                <AvatarFallback className="text-base uppercase text-muted bg-foreground font-medium">
                                                    {fm.relatedMember?.firstName.charAt(
                                                        0
                                                    )}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <div className="block">
                                            <p className="text-xs font-medium">
                                                {fm.relatedMember?.firstName}{' '}
                                                {fm.relatedMember?.lastName}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {fm.relationship
                                                    .toString()
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    fm.relationship
                                                        .toString()
                                                        .slice(1)}{' '}
                                                <span className="text-muted-foreground">
                                                    {' '}
                                                    -{' '}
                                                </span>{' '}
                                                {fm.relatedMember?.email.substring(
                                                    0,
                                                    15
                                                )}
                                                ...
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Joined on{' '}
                                                {fm.relatedMember?.created.toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </HoverCardContent>
                            </HoverCard>
                        </li>
                    ))}
            </ul>
        </div>
    )
}
