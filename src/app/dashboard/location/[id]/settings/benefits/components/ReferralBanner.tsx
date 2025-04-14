'use client'
import React from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { CopyIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function ReferralBanner() {
    return (
        <Card className='rounded-sm border-indigo-500 bg-indigo-500 text-white'>
            <CardContent className='p-4'>
                <div className='flex flex-row items-center just gap-4'>
                    <div>
                        <Image src={"/images/monstro-referral.webp"} alt='welcome' width={300} height={300} />
                    </div>
                    <div>
                        <div className='text-xl font-bold '>Refer friends and earn!</div>
                        <p className='text-sm text-indigo-200'>
                            Tell your friends about Monstro, they will get $100 upon signing up and you will receive $100 in credits.
                            Plus earn bonus points for each referral and used it on cool rewards.
                        </p>
                    </div>
                    <div>
                        <div className='flex flex-col space-y-1-1'>
                            <span className='text-xs font-normal text-indigo-200'>Copy my code</span>
                            <div className='bg-white/10 rounded-xs px-3 py-1.5 flex items-center gap-2'>
                                <span className='text-sm font-bold'>WX34L</span>
                                <Button size={'icon'} variant={'ghost'} onClick={() => navigator.clipboard.writeText('WX34L')} className='h-auto leading-none'>
                                    <CopyIcon size={16} />
                                </Button>
                            </div>
                        </div>
                    </div>

                </div>
            </CardContent>
        </Card>

    )
}
