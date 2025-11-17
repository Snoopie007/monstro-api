'use client'
import { cn } from '@/libs/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';



const AccountNavItems = [
    {
        name: 'Profile',
        path: 'profile'
    },
    {
        name: 'Password',
        path: 'password'
    },

]

const NavStyle = ' block   text-sm p-3 hover:bg-accent rounded-md';
export function AccountNav({ uid }: { uid: string }) {
    const pathname = usePathname();

    function isActive(path: string) {
        return pathname.includes(path);
    }
    return (
        <aside className="col-span-2">
            <ul className="text-foreground flex flex-col gap-2">
                <li className={cn("font-semibold ")}>
                    <Link href={`/dashboard/locations`}
                        className={cn(NavStyle, "flex flex-row items-center gap-2")}>
                        <ArrowLeft size={16} />
                        <span>  Back to dashboard</span>
                    </Link>
                </li>
                {AccountNavItems.map((item, i) => (
                    <li key={i} className={cn("font-semibold rounded-md", isActive(item.path) && 'bg-accent')}>
                        <Link href={`/dashboard/account/${uid}/${item.path}`}
                            className={NavStyle}>
                            {item.name}
                        </Link>
                    </li>
                ))}

            </ul>
        </aside>
    )
}

