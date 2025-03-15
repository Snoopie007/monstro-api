'use client'
import { cn } from '@/libs/utils';

import Image from 'next/image';

import { usePathname } from 'next/navigation';
import {
    Avatar, AvatarFallback, AvatarImage,
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui';
import { signOut, useSession } from 'next-auth/react';



function OnboardingHeader() {
    const pathname = usePathname();
    const pathSegments = pathname.split('/').filter(Boolean);
    const { data: session } = useSession();
    const user = session?.user;

    async function logOut() {
        await signOut();
        location.reload()
    }

    return (
        <div className=" w-full border-b border-foreground/10 py-2 px-3 flex flex-initial justify-between">
            <div className='flex flex-row items-center gap-2'>
                <div className={cn('logo  flex flex-row ')}>
                    <Image src='/images/monstro-icon.webp' alt='' width={24} height={24} />
                </div>
            </div>
            <div className='flex flex-row items-center gap-3'>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        {/* <Avatar className="ml-2  h-7 w-7">
                            <AvatarImage src={`${user.image ? user.image : ""}`} alt={user.name} />
                            <AvatarFallback className="text-xs  bg-gray-200 text-black/80  font-semibold">
                                {`${user.name.charAt(0)}${user.name.charAt(user.name.indexOf(' ') + 1)}`}
                            </AvatarFallback>
                        </Avatar> */}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className='bg-white'>

                        <DropdownMenuItem onClick={logOut} className="bg-red-500 cursor-pointer font-medium text-white hover:bg-red-600">
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}
export {
    OnboardingHeader
}