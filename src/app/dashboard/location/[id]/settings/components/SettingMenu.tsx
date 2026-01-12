'use client'
import { cn } from '@/libs/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation';
type SettingMenuItem = {
    name: string;
    path: string;
    roles: string[];
};

const SettingMenuItems: SettingMenuItem[] = [
    { path: "company", name: "Company Info", roles: ["vendor", "admin"] },
    { path: "cfs", name: "Custom Fields", roles: ["vendor", "admin"] },
    { path: "tax", name: "Tax", roles: ["vendor", "admin"] },
    { path: "roles", name: "Roles", roles: ["vendor"] },
    { path: "billing", name: "Billing", roles: ["vendor"] },
    { path: "invoices", name: "Invoices", roles: ["vendor"] },
    { path: "tags", name: "Tags", roles: ["vendor", "admin"] },
    { path: "closures", name: "Holidays & Closures", roles: ["vendor", "admin"] },
    // { path: "benefits", name: "Benefits", roles: ["vendor"] },
    { path: "integrations", name: "Integrations", roles: ["vendor", "admin"] },
    { path: "processing", name: "Payment Processing", roles: ["vendor", "admin"] },
];

export function SettingMenu({ roles, locationId }: { roles: string, locationId: string }) {
    const pathname = usePathname();

    function isActive(path: string) {
        return pathname.includes(path);
    }
    return (
        <aside className="col-span-2 ">
            <ul className="text-foreground flex flex-col gap-2">
                {SettingMenuItems.filter(item => item.roles.includes(roles)).map((item, i) => (
                    <li key={i} className={cn("font-semibold rounded-sm", isActive(item.path) && 'bg-accent')}>
                        <Link href={`/dashboard/location/${locationId}/settings/${item.path}`}
                            className='block  text-sm px-3 py-2 hover:bg-accent rounded-sm'>
                            {item.name}
                        </Link>
                    </li>
                ))}
            </ul>
        </aside>
    )
}

