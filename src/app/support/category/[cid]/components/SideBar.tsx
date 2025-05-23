import Link from 'next/link'
import React from 'react'
import { SupportCategory } from '@/types/admin';
import SideSupport from './SideSupport';



export function SideBar({ categories }: { categories: SupportCategory[] | undefined }) {
    return (
        <div className='px-4 py-6 rounded-md bg-foreground/5 space-y-4 sticky'
            style={{ top: '10px', scrollBehavior: 'smooth' }}>
            <h2 className='text-base font-semibold '>Support Categories</h2>
            <ul className='space-y-2'>
                {categories && categories.map((c) => (
                    <li key={c.id}>
                        <Link href={`/support/category/${c.name.toLocaleLowerCase()}`} className='font-medium text-sm' >
                            {c.name}

                        </Link>
                    </li>
                ))}
            </ul>
            <div className='border-b my-4 border-foreground/5'></div>
            <SideSupport />
        </div>
    )
}
