'use client'
import { cn } from '@/libs/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation';



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

const NavStyle = ' block   text-sm px-3 py-2 hover:bg-accent rounded-sm';
export function AccountNav({ uid }: { uid: string }) {
    const pathname = usePathname();

    function isActive(path: string) {
        return pathname.includes(path);
    }
    return (
        <aside className="col-span-2">
            <ul className="text-foreground flex flex-col gap-2">
                {AccountNavItems.map((item, i) => (
                    <li key={i} className={cn("font-semibold rounded-sm", isActive(item.path) && 'bg-accent')}>
                        <Link href={`/dashboard/account/${uid}/${item.path}`}
                            className={NavStyle}>
                            {item.name}
                        </Link>
                    </li>
                ))}
                <li className={cn("font-semibold ")}>
                    <Link href={`/dashboard/locations`}
                        className={NavStyle}>
                        Back
                    </Link>
                </li>
            </ul>
        </aside>
    )
}

