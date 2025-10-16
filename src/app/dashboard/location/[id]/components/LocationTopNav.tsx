'use client'
import { cn } from '@/libs/utils'
import Image from 'next/image'

import LocationSelect from './SelectLocation'
import { NovuInbox, SupportMenu, UserMenu } from '@/components/navs'

import React from 'react'
import { usePathname } from 'next/navigation'

export function LocationTopNav({ lid }: { lid?: string }) {
    const pathname = usePathname()
    const pathSegments = pathname.split('/').filter(Boolean)

    return (
        <div className=" w-full border-b border-foreground/10 py-2 px-3 flex flex-initial justify-between">
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
                <NovuInbox />
                <SupportMenu />
                <UserMenu />
            </div>
        </div>
    )
}
