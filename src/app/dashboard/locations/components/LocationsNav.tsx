'use client'
import { NovuInbox, SupportMenu, UserMenu } from '@/components/navs'
import React from 'react'
import { cn } from '@/libs/utils'
import Image from 'next/image'
import { useSession } from '@/hooks/useSession'

export function LocationsNav() {
    const { data: session } = useSession();
    const user = session?.user;
    return (
        <div className=" w-full border-b border-foreground/10 py-2 px-3 flex flex-initial justify-between">
            <div className="flex flex-row items-center gap-2">
                <div className={cn('flex flex-row ')}>
                    <Image
                        src="/images/monstro-icon.webp"
                        alt=""
                        width={24}
                        height={24}
                    />
                </div>
            </div>
            <div className="flex flex-row items-center gap-2">
                <NovuInbox user={user} />
                <UserMenu user={user} />
            </div>
        </div>
    )
}
