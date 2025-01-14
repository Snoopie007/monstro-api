import { cn } from '@/libs/utils'
import Link from 'next/link'
import { SettingMenuItems } from './setting-menu-items'


export default function SettingMenu({ roles, locationId }: { roles: string, locationId: string }) {
    return (
        <aside className="col-span-2">
            <ul className="text-foreground flex flex-col gap-1">
                {SettingMenuItems.filter(item => item.roles.includes(roles)).map((item, i) => (
                    <li key={i} className={cn("font-semibold ")}>
                        <Link href={`/dashboard/${locationId}/settings/${item.path}`}
                            className='block h-full w-full  text-sm px-4 py-2 hover:bg-accent rounded-sm'>
                            {item.name}
                        </Link>
                    </li>
                ))}
            </ul>
        </aside>
    )
}

