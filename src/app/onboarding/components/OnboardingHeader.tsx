'use client'
import { cn } from '@/libs/utils';

import Image from 'next/image';

import { usePathname } from 'next/navigation';
import ThemeMenu from '@/components/ui/ThemeMenu';



function OnboardingHeader() {
    const pathname = usePathname();
    const pathSegments = pathname.split('/').filter(Boolean);
    const currentPath = pathSegments;

    return (
        <div className=" w-full border-b border-foreground/10 py-2 px-3 flex flex-initial justify-between">


            <div className='flex flex-row items-center gap-2'>
                <div className={cn('logo  flex flex-row ')}>
                    <Image src='/images/monstro-icon.webp' alt='' width={24} height={24} />
                </div>



            </div>
            <div className='flex flex-row items-center gap-3'>
                <div>
                    <ThemeMenu />
                </div>

                <div>

                </div>
            </div>
        </div>
    )
}
export {
    OnboardingHeader
}