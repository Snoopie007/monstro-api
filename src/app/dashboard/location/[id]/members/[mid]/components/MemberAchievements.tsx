'use client'

import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui'
import {
    Item,
    ItemContent,
    ItemMedia,
} from '@/components/ui/item'
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
            <ItemContent>
                <span className="font-medium">
                    {achievement?.name}
                </span>
                <span className="text-muted-foreground text-xs">
                    {ma.dateAchieved ? format(ma.dateAchieved, 'MMM d, yyyy') : 'In Progress'}
                </span>
            </ItemContent>
        </Item>
    )
}