'use client'
import { cn } from '@/libs/utils'
import Image from 'next/image'

import LocationSelect from './SelectLocation'
import { NovuInbox, SupportMenu, UserMenu } from '@/components/navs'
import { useAccountStatus } from '../providers'
import React from 'react'
import { useSession } from '@/hooks/useSession'

export function LocationTopNav({ lid }: { lid?: string }) {

    const { locationState } = useAccountStatus()
    const { data: session } = useSession()
    const user = session?.user!
    return (
        <div className=" w-full  py-2 px-3 flex flex-initial justify-between">
            <div className="flex flex-row items-center gap-2">
                <div className={cn('logo  flex flex-row ')}>
                    <Image
                        src="/images/monstro-icon.webp"
                        alt=""
                        width={24}
                        height={24}
                    />
                </div>
                {lid && <LocationSelect locationId={lid} />}
            </div>
            <div className="flex flex-row items-center gap-2">
                <NovuInbox user={user} />
                <SupportMenu locationState={locationState} />
                <UserMenu user={user} />
            </div>
        </div>
    )
}
