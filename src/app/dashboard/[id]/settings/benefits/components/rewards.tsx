'use client'
import { Button } from '@/components/ui/button'

import { cn } from '@/libs/utils'
import { VendorClaimedReward } from '@/types'
import Image from 'next/image'
import React from 'react'

interface VendorRewardsProps {
    claimedRewards: VendorClaimedReward[];
}

export function VendorRewards({ claimedRewards }: VendorRewardsProps) {
    return (
        <div className='flex flex-col gap-2'>
            <div className='flex flex-row items-center justify-between gap-2'>
                <div>
                    <input type="text" placeholder='Search badges' className='w-full border border-foreground/10 rounded-xs text-xs p-2' />
                </div>
                <Button variant="foreground" size="xs" className=''>
                    Browse Rewards
                </Button>
            </div>
            <div className='grid grid-cols-3 gap-2'>
                {claimedRewards.map((claimedReward, i) => (
                    <RewardItem key={i} claimedRewards={claimedReward} />
                ))}
            </div>
        </div>
    )
}


function RewardItem({ claimedRewards }: { claimedRewards: VendorClaimedReward }) {

    return (
        <div className={cn('col-span-1 min-h-[260px] border border-foreground/10 rounded-xs p-6 text-left relative')}>
            <div className='flex flex-col gap-2 items-center relative'>

                <div className='relative flex-initial'>
                    <Image src={`/images/icons/badges/${claimedRewards.reward?.images}`} alt={claimedRewards.reward?.name!} width={100} height={100}
                        className={cn('grayscale -z-10')} />

                    <div className='flex flex-col gap-1 flex-1 text-center  '>
                        <span className={cn('text-sm font-medium')}>
                            {claimedRewards.reward?.name}
                        </span>
                        <span className={cn('text-xs text-muted-foreground')}>
                            {claimedRewards.reward?.description}
                        </span>

                    </div>
                </div>

            </div>
        </div>
    )
}
