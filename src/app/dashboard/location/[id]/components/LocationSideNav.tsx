'use client'
import { cn } from '@/libs/utils';
import Link from 'next/link';
import { motion } from "framer-motion"

import { SidebarMenuItems } from './MenuItems';
import { Icon } from '@/components/icons';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui"
import React from 'react';
import { useAccountStatus } from '../providers/AccountStatusProvider';



export function LocationSideNav({ lid }: { lid: string }) {
    const [currentMenuToggle, setCurrentMenuToggle] = React.useState<string | null>(null)
    const [isOpen, setIsOpen] = React.useState<boolean>(false)
    const { locationState } = useAccountStatus();

    const iconContainerClass = "flex-initial inline-flex flex-row justify-start gap-2 h-auto items-center text-nowrap"
    const subMenuItemClass = "text-xs block px-2 py-1.5 hover:bg-foreground/10 rounded-sm font-semibold w-full"
    const menuLinkClass = "flex flex-row justify-start gap-2 hover:bg-foreground/10 rounded-sm py-2 px-2.5 items-center"

    return (
        <aside className="h-full">
            <nav className='flex-row flex w-full h-full relative'>
                <motion.aside whileHover={{ width: "300px" }}
                    className={"border-r border-gray-100 w-[56px] group overflow-hidden h-full"}
                    onMouseEnter={() => setIsOpen(true)}
                    onMouseLeave={() => {
                        setCurrentMenuToggle(null)
                        setIsOpen(false)
                    }}
                    data-state={isOpen ? 'open' : 'closed'}
                >
                    <div className='w-full py-6 px-2'>
                        <ul className='space-y-2'>
                            {SidebarMenuItems.map((item) => (
                                <React.Fragment key={item.name}>
                                    {item.subMenu ? (
                                        <li className='w-full group' >
                                            <Collapsible
                                                open={currentMenuToggle === item.name}
                                                onOpenChange={(open) => open ? setCurrentMenuToggle(item.name) : setCurrentMenuToggle(null)}
                                            >
                                                <CollapsibleTrigger value={item.name}
                                                    disabled={locationState.status !== "active"}
                                                    className={'flex flex-row items-center w-full justify-between hover:bg-foreground/10 inactive:opacity-50 rounded-sm py-2 px-2'}
                                                >
                                                    <div className={cn(iconContainerClass)}>
                                                        <span><Icon name={item.icon} size={16} /></span>
                                                        <b className='group-data-[state=closed]:opacity-0 font-semibold flex-1 text-xs'>{item.name}</b>
                                                    </div>
                                                    <Icon name='ChevronsUpDown' />
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className='mx-4 border-foreground/20 border-l mt-2'>
                                                    <ul className='px-2 space-y-1'>
                                                        {item.subMenu.map((subItem) => (
                                                            <li key={subItem.name} className='w-full inactive:opacity-50'>
                                                                <Link href={`/dashboard/location/${lid}/${subItem.path}`}
                                                                    className={cn(subMenuItemClass)}>
                                                                    {subItem.name}
                                                                </Link>

                                                            </li>
                                                        ))}
                                                    </ul>
                                                </CollapsibleContent>
                                            </Collapsible>
                                        </li>
                                    ) : (
                                        <li className='w-full inactive:opacity-50'>
                                            <Link href={`/dashboard/location/${lid}/${item.path}`} className={cn(menuLinkClass, 'inactive:hidden')}>
                                                <span><Icon name={item.icon} size={16} /></span>
                                                <b className='group-data-[state=closed]:opacity-0 font-semibold flex-1 text-xs'>{item.name}</b>
                                            </Link>
                                            <div className={cn(menuLinkClass, 'inactive:flex cursor-not-allowed hidden')}>
                                                <span><Icon name={item.icon} size={16} /></span>
                                                <b className='group-data-[state=closed]:opacity-0 font-semibold flex-1 text-xs'>{item.name}</b>
                                            </div>
                                        </li>
                                    )}
                                </React.Fragment>
                            ))}
                        </ul>
                    </div>
                </motion.aside>
            </nav>
        </aside>
    )
}

