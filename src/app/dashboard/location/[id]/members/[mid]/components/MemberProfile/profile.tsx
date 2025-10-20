'use client'
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    Badge,
    Button,
    Card,
    CardContent,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui'

import {
    CalendarCheck2,
    ChevronLeft,
    Ellipsis,
    Mail,
    PhoneCall,
} from 'lucide-react'
import { useMemberStatus } from '../../providers/MemberContext'
import { useRouter } from 'next/navigation'
import { MemberDeleteButton, MemberEditButton } from '../ContactInfo'
import { usePermission } from '@/hooks/usePermissions'
import { Item, ItemContent } from '@/components/ui/item'

type MemberProfileData = {
    totalPointsEarned: number
    lastSeenFormatted: string
}

interface MemberProfileProps {
    params: { id: string; mid: string }
    profileData: MemberProfileData
}

const hoverTransition =
    'group-hover:bg-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300'

export function MemberProfile({ params, profileData }: MemberProfileProps) {
    const canDeleteMember = usePermission('delete member', params.id)
    const canEditMember = usePermission('edit member', params.id)
    const { member, ml } = useMemberStatus()
    const router = useRouter()

    const memberProfile = ml?.profile || member

    const truncatedEmail =
        memberProfile?.email?.length > 15
            ? memberProfile?.email?.substring(0, 20) + '...'
            : memberProfile?.email
    const truncatedPhone =
        memberProfile?.phone?.length > 15
            ? memberProfile?.phone?.substring(0, 15) + '...'
            : memberProfile?.phone

    return (
        <Card className="border-none">
            <CardContent className="pb-1 px-0">
                <div className="flex justify-between flex-row items-center px-4 py-2 gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            router.back()
                        }}
                        className="bg-foreground/5 size-6"
                    >
                        <ChevronLeft className="size-4" />
                    </Button>
                </div>

                <div className="flex px-4 py-4 gap-6 items-end">
                    <div className="flex-initial relative">
                        <Avatar className="w-20 h-20 rounded-full mx-auto">
                            <AvatarImage src={memberProfile?.avatar || ''} />
                            <AvatarFallback className="text-4xl uppercase text-muted bg-foreground font-medium">
                                {(
                                    memberProfile?.firstName ||
                                    memberProfile?.lastName
                                )?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="font-bold text-lg flex flex-row items-center gap-2">
                            <span>{memberProfile?.firstName}</span>
                            <div className="flex flex-row group">
                                <Button
                                    variant="default"
                                    size="icon"
                                    className="size-7 bg-transparent text-foreground hover:bg-foreground/5 group-hover:bg-foreground/5 group-hover:dark:bg-foreground/5 flex-1 rounded-r-none"
                                >
                                    <Ellipsis className="size-4 dark:text-foreground text-foreground" />
                                </Button>
                                {canEditMember && (
                                    <MemberEditButton
                                        params={params}
                                        className={hoverTransition}
                                    />
                                )}
                                {canDeleteMember && (
                                    <MemberDeleteButton
                                        params={params}
                                        className={hoverTransition}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="flex flex-row gap-2 flex-wrap">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge
                                        variant="secondary"
                                        className="text-xs"
                                    >
                                        <Mail size={14} />
                                        <span>{truncatedEmail}</span>
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{memberProfile?.email}</p>
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge
                                        variant="secondary"
                                        className="text-xs"
                                    >
                                        <PhoneCall size={14} />
                                        <span>{truncatedPhone}</span>
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{memberProfile?.phone}</p>
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge
                                        variant="secondary"
                                        className="text-xs"
                                    >
                                        <CalendarCheck2 size={14} />
                                        <span>
                                            {profileData.lastSeenFormatted}
                                        </span>
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>
                                        Last seen on{' '}
                                        {profileData.lastSeenFormatted}
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                </div>

                <div className="p-4">
                    <Item variant="muted">
                        <ItemContent>
                            <div className="flex-1 flex flex-row gap-4">
                                <div className="flex flex-col gap-1">
                                    <span className="font-medium text-md">
                                        Total Points Earned
                                    </span>
                                    <span className="text-sm">
                                        {profileData.totalPointsEarned}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="font-medium text-md">
                                        Current Points Balance
                                    </span>
                                    <span className="text-sm">
                                        {ml?.points || 0}
                                    </span>
                                </div>
                            </div>
                        </ItemContent>
                    </Item>
                </div>
            </CardContent>
        </Card>
    )
}
