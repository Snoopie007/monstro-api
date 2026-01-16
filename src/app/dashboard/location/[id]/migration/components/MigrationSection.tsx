'use client'

import Link from 'next/link'
import { FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MigrationList } from '.'

export function MigrationSection({ lid }: { lid: string }) {
    return (
        <>
            <div className="flex flex-row items-center justify-between">
                <h2 className="text-xl font-semibold">Migrations</h2>
                <Button variant="primary" asChild>
                    <Link href={`/dashboard/location/${lid}/migration/import`} className='flex flex-row items-center gap-2'>
                        <FileDown className='size-4' />
                        <span>Import Members</span>
                    </Link>
                </Button>
            </div>
            <div className="border border-foreground/10 rounded-lg">
                <MigrationList lid={lid} />
            </div>
        </>
    )
}
