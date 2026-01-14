'use client'

import {
    Empty, EmptyHeader, EmptyMedia,
    EmptyTitle, EmptyDescription, Progress, Item, ItemContent, ItemMedia
} from '@/components/ui'

import { useMemberAchievements } from '@/hooks'
import { MemberAchievement } from '@/types'
import { format } from 'date-fns'
import { TrophyIcon } from 'lucide-react'
import Image from 'next/image'

export function MemberAchievements({ params }: { params: { id: string; mid: string } }) {
    const { mas, isLoading } = useMemberAchievements(params.id, params.mid)

    return (
        <div className="space-y-2">
            {mas && mas.length > 0 ? (
                <div className="space-y-2">
                    {mas.map((ma) => (
                        <MemberAchievementItem key={ma.achievementId} ma={ma} />
                    ))}
                </div>
            ) : (
                <Empty variant="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <TrophyIcon className="size-5" />
                        </EmptyMedia>
                        <EmptyTitle>No achievements found</EmptyTitle>
                        <EmptyDescription>Achievements will appear here when they are earned</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}
        </div>
    )
}

function MemberAchievementItem({ ma }: { ma: MemberAchievement }) {
    const achievement = ma.achievement
    return (
        <Item variant="muted" >
            <ItemMedia variant="image">
                <Image src={achievement?.badge || ''} alt={achievement?.name || ''} width={50} height={50} />
            </ItemMedia>
            <ItemContent className="flex flex-row justify-between gap-2 items-center">
                <div className="flex flex-col ">
                    <span className="text-sm font-medium">
                        {achievement?.name}
                    </span>
                    <span className="text-muted-foreground text-xs">
                        {achievement?.points} points
                    </span>
                </div>
                <span className="text-muted-foreground text-sm">
                    {ma.dateAchieved ?
                        (
                            <span className="text-muted-foreground text-sm">
                                Achieved on {format(ma.dateAchieved, 'MMM d, yyyy')}
                            </span>
                        ) : (
                            <div className="flex flex-col justify-center items-center">

                                <Progress
                                    value={((ma.progress || 0) / (achievement?.requiredActionCount || 1)) * 100}
                                    className="h-2 w-24 bg-foreground/10"
                                />
                                <span className="text-muted-foreground text-xs font-medium">
                                    {ma.progress || 0} / {achievement?.requiredActionCount || 1}
                                </span>
                            </div>
                        )}
                </span>
            </ItemContent>
        </Item >
    )
}