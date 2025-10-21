'use client'
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    Badge,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
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


export function MemberProfile({ params, profileData }: MemberProfileProps) {
    const canDeleteMember = usePermission('delete member', params.id)
    const canEditMember = usePermission('edit member', params.id)

    const { member, ml } = useMemberStatus()
    const router = useRouter()

    const memberProfile = ml?.profile || member


    return (
        <Card className="border-none">
            <CardHeader className="p-0">
                <CardTitle></CardTitle>
                <div className="flex justify-between flex-row items-center ">
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
                    <div className="flex flex-row group">
                        <Button
                            variant="default"
                            size="icon"
                            className="bg-foreground/5 size-6"
                        >
                            <Ellipsis className="size-4 dark:text-foreground text-foreground" />
                        </Button>
                        {canEditMember && (
                            <MemberEditButton
                                params={params}
                            />
                        )}
                        {canDeleteMember && (
                            <MemberDeleteButton
                                params={params}
                            />
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6 pb-6 px-0">
                <div className="flex flex-row gap-4">
                    <Avatar className="size-20 rounded-full">
                        <AvatarImage src={memberProfile?.avatar || '/images/default-avatar.png'} />
                    </Avatar>

                    <div className="flex flex-col gap-4 flex-1">
                        <div className="space-y-0.5 pt-2">
                            <div className="font-bold text-lg leading-5">
                                {memberProfile?.firstName} {memberProfile?.lastName}
                            </div>
                            <span className="text-sm text-muted-foreground">{memberProfile?.email}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="flex flex-col  space-y-1">
                                <span className=" text-muted-foreground  text-sm">
                                    Total Points Earned
                                </span>
                                <span className="font-bold  text-sm">
                                    {profileData.totalPointsEarned} points
                                </span>
                            </div>

                            <div className="flex flex-col space-y-1">
                                <span className=" text-muted-foreground  text-sm">
                                    Current Points
                                </span>
                                <span className="font-bold">
                                    {ml?.points || 0}
                                </span>
                            </div>
                            <div className="flex flex-col space-y-1">
                                <span className=" text-muted-foreground  text-sm">
                                    Last seen
                                </span>
                                <span className="font-bold text-sm ">
                                    {profileData.lastSeenFormatted}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>


            </CardContent>
        </Card>
    )
}
