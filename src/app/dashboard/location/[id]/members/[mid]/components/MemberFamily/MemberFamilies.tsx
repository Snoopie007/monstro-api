'use client'
import { Avatar, AvatarImage, Badge } from '@/components/ui'
import { useMemberStatus } from '../../providers/MemberContext'
import { FamilyMember } from '@/types/FamilyMember'
import AddChildMember from './AddMember'
import {
    Item,
    ItemContent,
    ItemHeader,
    ItemTitle,
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from '@/components/ui'

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
        <Item variant="muted" className="px-3 py-2">
            <ItemHeader>
                <ItemTitle>Family Members</ItemTitle>
            </ItemHeader>
            <ItemContent>
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
                                                <Avatar className="size-8 rounded-full mx-auto">
                                                    <AvatarImage src={fm.relatedMember?.avatar || '/images/default-avatar.png'} />

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
            </ItemContent>
        </Item>
    )
}
