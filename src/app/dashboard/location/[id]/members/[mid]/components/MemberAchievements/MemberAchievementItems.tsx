'use client'

import { ScrollArea, Skeleton } from '@/components/ui'
import {
    Item,
    ItemContent,
    ItemDescription,
    ItemMedia,
    ItemTitle,
} from '@/components/ui/item'
import { useMemberAchievements } from '@/hooks'
import { format } from 'date-fns'
import { Trophy } from 'lucide-react'

export const MemberAchievementItems = ({
    params,
}: {
    params: { id: string; mid: string }
}) => {
    const {
        mas: achievements,
        isLoading,
        error,
    } = useMemberAchievements(params.id, params.mid)

    if (isLoading) {
        return (
            <div className="flex flex-col gap-2">
                <Skeleton className="w-full h-24 " />
                <Skeleton className="w-full h-16 " />
                <Skeleton className="w-full h-16 " />
            </div>
        )
    }
    console.log(achievements)
    const renderAchievements = () => {
        return achievements && achievements.length > 0 ? (
            achievements.map((achievement) => (
                <li key={achievement.achievementId}>
                    <Item
                        variant="muted"
                        className="hover:bg-muted-foreground/5"
                    >
                        <ItemContent>
                            <ItemTitle>
                                {achievement.achievement?.name}
                            </ItemTitle>
                            <ItemDescription>
                                {achievement.dateAchieved
                                    ? format(
                                          achievement.dateAchieved,
                                          'MMM d, yyyy'
                                      )
                                    : '-'}{' '}
                                {achievement.achievement?.description}
                            </ItemDescription>
                        </ItemContent>
                    </Item>
                </li>
            ))
        ) : (
            <li>
                <Item variant="muted" className="hover:bg-muted-foreground/5">
                    <ItemContent>
                        <ItemTitle>No achievements found</ItemTitle>
                    </ItemContent>
                </Item>
            </li>
        )
    }

    return (
        <div className="mb-4">
            <div className="flex flex-row items-center justify-between gap-2 mb-2">
                <h2 className="text-md text-muted-foreground font-medium">
                    Achievements
                </h2>
            </div>
            <ScrollArea className="max-h-[350px] w-full">
                <ul className="flex flex-col gap-2">{renderAchievements()}</ul>
            </ScrollArea>
        </div>
    )
}
