'use client'
import { AlertMenu, SupportMenu, UserMenu } from '@/components/navs';
import Link from 'next/link';
import React from 'react';
import { cn } from '@/libs/utils';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function SupportNav() {
    const { data: session } = useSession();
    return (
        <div className={cn(
            " w-full border-b border-foreground/5 flex-initial "
        )}>

            <div className={cn("w-full flex flex-row justify-between py-2 px-3 ",
                { "max-w-6xl mx-auto  py-2 px-0 ": !session })}
            >
                <div className='flex flex-row items-center gap-2'>
                    <div className={cn('logo  flex flex-row items-center gap-2')}>
                        <Image src='/images/monstro-icon.webp' alt='' width={24} height={24} />
                        <span className='text-sm font-semibold'>Monstro Support</span>
                    </div>
                </div>

                {session ? (
                    <div className='flex flex-row items-center gap-2'>

                        <AlertMenu />
                        <SupportMenu />
                        <UserMenu />
                    </div>
                ) : (
                    <div className='flex flex-row items-center gap-2'>
                        <Button variant='foreground' size='xs' className='rounded-sm' asChild>
                            <Link href={`/login?callbackUrl=${encodeURIComponent('/support')}`}>Login</Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
