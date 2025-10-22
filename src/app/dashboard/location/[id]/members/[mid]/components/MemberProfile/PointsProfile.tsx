'use client'
import { useMemo } from 'react'
import { useMemberStatus } from '../../providers/MemberContext'

type MemberProfileData = {
    totalPointsEarned: number
    lastSeenFormatted: string
}
export function PointsProfile({ profileData }: { profileData: MemberProfileData }) {

    const { ml } = useMemberStatus()

    const spentPoints = useMemo(() => {
        return ml.points - profileData.totalPointsEarned
    }, [ml?.points, profileData.totalPointsEarned])
    return (
        <div className='grid grid-cols-3 gap-2'>
            <div className='bg-muted/50 rounded-lg p-3 flex flex-col gap-1'>
                <div className='text-xs uppercase text-muted-foreground'>
                    Total Earned
                </div>
                <div className='text-lg font-bold'>
                    <span>{profileData.totalPointsEarned}</span>

                </div>
            </div>
            <div className='bg-muted/50 rounded-lg p-3 flex flex-col gap-1'>
                <div className='text-xs uppercase text-muted-foreground'>
                    Current Balance
                </div>
                <div className='text-lg font-bold'>
                    <span>{ml.points}</span>
                </div>
            </div>
            <div className='bg-muted/50 rounded-lg p-3 flex flex-col gap-1'>
                <div className='text-xs uppercase text-muted-foreground'>
                    Total Spent
                </div>
                <div className='text-lg font-bold'>
                    <span>{spentPoints}</span>
                </div>
            </div>
        </div>
    )
}