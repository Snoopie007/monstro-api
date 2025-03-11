'use client'
import { VendorLevels } from "./data";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import { Vendor } from "@/types";

interface VendorProgressOverviewProps {

    vendor: Vendor;
}

export function VendorProgressOverview({ vendor }: VendorProgressOverviewProps) {
    const progress = vendor.vendorProgress!;
    const currentLevel = VendorLevels.find(
        level => progress?.totalPoints >= level.min && progress?.totalPoints <= level.max
    ) || VendorLevels[VendorLevels.length - 1];

    return (
        <>
            <div className='flex flex-row gap-6 py-4'>
                <div className='flex-initial'>
                    <Image src={`/images/icons/levels/${currentLevel?.icon}`} alt='welcome' width={100} height={100} />

                </div>
                <div className='flex-1 flex flex-col gap-2'>
                    <div className='flex flex-col '>
                        <span className='text-indigo-600 text-xl font-bold '>
                            Current level: {currentLevel?.level}
                        </span>
                        <span className='text-xs text-muted-foreground'>Level up by earning earning points. For each level get $25 off every month for life.</span>
                    </div>


                    <div className="flex flex-col gap-1">
                        <Progress value={(progress.totalPoints / (currentLevel?.max || 1)) * 100} className='h-2' />
                        <span className="text-xs text-muted-foreground flex justify-between font-bold">
                            <span> {progress.totalPoints} points earned</span>
                            <span> {currentLevel?.max ? currentLevel.max - progress.totalPoints : 0} till next level</span></span>
                    </div>
                    <div className='flex flex-row gap-2'>
                        <Badge className='bg-indigo-600 text-white rounded-xs'>Total Points: {progress.totalPoints}</Badge>
                        <Badge className='bg-sky-600 text-white rounded-xs'>Referrals: {vendor.referrals?.length}</Badge>
                        <Badge className='bg-green-500 text-white rounded-xs'>Achievements: {progress.badges?.length}</Badge>
                    </div>
                </div>

            </div>
            <div className='flex flex-row gap-2 border-t border-foreground/10 py-4'>
                <span className='text-sm font-medium text-muted-foreground'>Active rewards</span>
            </div>

        </>
    )
}