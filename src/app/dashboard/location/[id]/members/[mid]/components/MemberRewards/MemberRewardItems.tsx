'use client'

import { ScrollArea, Skeleton } from '@/components/ui'
import {
    Item,
    ItemContent,
    ItemDescription,
    ItemTitle,
} from '@/components/ui/item'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'

export const MemberRewardItems = ({
    params,
}: {
    params: { id: string; mid: string }
}) => {
    const [rewards, setRewards] = useState<Array<any>>([])
    const [isLoading, setIsLoading] = useState<boolean>(true)

    useEffect(() => {
        const fetchRewards = async () => {
            try {
                const res = await fetch(
                    `/api/protected/loc/${params.id}/rewards?id=${params.mid}`
                )
                if (res.ok) {
                    const data = await res.json()
                    setRewards(data)
                }
            } catch (error) {
                console.error('Failed to fetch rewards:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchRewards()
    }, [params.id])

    if (isLoading) {
        return <Skeleton className="w-full h-24 " />
    }

    const renderRewards = () => {
        console.log(rewards)
        return rewards && rewards.length > 0 ? (
            rewards.map((reward) => (
                <li key={reward.id}>
                    <Item
                        variant="muted"
                        className="hover:bg-muted-foreground/5"
                    >
                        <ItemContent>
                            <ItemTitle>
                                {reward.name}
                                {' • '}
                                <span className="text-muted-foreground text-xs">
                                    {reward.created
                                        ? format(
                                              new Date(reward.created),
                                              'MMM d, yyyy'
                                          )
                                        : '-'}
                                </span>
                            </ItemTitle>
                            <ItemDescription>
                                {reward.description}{' '}
                            </ItemDescription>
                        </ItemContent>
                    </Item>
                </li>
            ))
        ) : (
            <li>
                <Item variant="muted" className="hover:bg-muted-foreground/5">
                    <ItemContent>
                        <ItemTitle>No rewards found</ItemTitle>
                    </ItemContent>
                </Item>
            </li>
        )
    }

    return (
        <div className="mb-4">
            <div className="flex flex-row items-center justify-between gap-2 mb-2">
                <h2 className="text-md text-muted-foreground font-medium">
                    Rewards
                </h2>
            </div>
            <ScrollArea className="h-[350px] w-full">
                <ul className="flex flex-col gap-2">{renderRewards()}</ul>
            </ScrollArea>
        </div>
    )
}
